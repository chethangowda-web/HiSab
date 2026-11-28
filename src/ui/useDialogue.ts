import { useCallback, useEffect, useRef, useState } from 'react';
import { db, deleteEntry, newId } from '../db/db';
import { localISODate } from '../domain/dates';
import type { Draft, Entry, Lang } from '../domain/types';
import { inr } from '../i18n/ui';
import { parseMultiUtterance, parseWithFallback } from '../nlu/llmParser';
import { moneyAmounts } from '../nlu/normalize';
import {
  CONFIDENCE_MIN,
  initialState,
  step,
  type DialogueCtx,
  type DialogueEvent,
  type DialogueState,
  type PendingAction,
  type Phase,
} from '../voice/dialogue';
import { saveClip } from '../db/db';
import { transcribeRecording, wisprConfigured } from '../voice/engine';
import { shouldSwitchLanguage } from '../voice/language';
import { canRecord, startRecorder, type Recording, type RecorderSession } from '../voice/recorder';
import { abortListening, isSpeechSupported, listen, stopListening } from '../voice/speechInput';
import { speak } from '../voice/speechOutput';
import { useApp } from './AppContext';

/** A short gap after the app finishes speaking, so the microphone does not pick up the end of its own voice. */
const AFTER_SPEECH_GAP_MS = import.meta.env.MODE === 'test' ? 0 : 300;

/** How long the "Saved · Undo" bar stays on screen. */
const SAVED_BAR_MS = 8000;

export interface SavedInfo {
  /** Every entry saved by this confirmation (several for "3 din"). */
  ids: string[];
  /** e.g. "Ramesh ₹500" or "Ramesh · 3 × ₹700" */
  label: string;
  /** Set if saving created this employer, so Undo can remove it again. */
  createdEmployerId?: string;
}

export interface DialogueView {
  phase: Phase;
  /** The last thing the app said, shown on screen as well as spoken. */
  phrase: string;
  /** What the app heard the user say, shown so mistakes are easy to spot. */
  heard: string;
  /** The entry waiting for a yes/no (CONFIRM phase, entries only). */
  draft?: Draft;
  /** A spoken command waiting for yes/no (CONFIRM phase, commands only). */
  action?: PendingAction;
  /** The entry just saved, until the bar times out or the next entry starts. */
  saved: SavedInfo | null;
  /** A reminder confirmed by voice: browsers need a tap to open WhatsApp, so show a button. */
  whatsappText?: string;
  listening: boolean;
  /** Which engine is listening right now. */
  engine?: 'wispr' | 'sarvam' | 'browser';
  /** Words heard so far, while still listening (browser speech only). */
  interim: string;
  /** Microphone level 0..1 for the waveform. */
  level: number;
  /** The recording behind the entry being confirmed (voice proof preview). */
  clip?: Blob;
  /** Wispr Flow failed and the app switched to phone speech for this turn. */
  wisprFailed?: boolean;
  /** Waiting for the optional local model, or for Wispr Flow's transcript. */
  thinking: boolean;
  /** Voice keeps failing: offer typed input. */
  needTyping: boolean;
  /** Set when the microphone cannot be used at all. */
  micIssue: '' | 'denied' | 'unsupported';
}

export interface UseDialogue extends DialogueView {
  supported: boolean;
  start(): void;
  /** Resolves once the whole turn is done: saved (if confirmed) and spoken. */
  typed(text: string): Promise<void>;
  yes(): void;
  no(): void;
  /** Removes the entries that were just saved. */
  undo(): Promise<void>;
  dismissWhatsApp(): void;
  /** Done: stop listening and use what was said. */
  stopListening(): void;
  /** Cancel: stop listening and discard. */
  cancelListening(): void;
}

const INITIAL_VIEW: DialogueView = {
  phase: 'IDLE',
  phrase: '',
  heard: '',
  saved: null,
  listening: false,
  interim: '',
  level: 0,
  thinking: false,
  needTyping: false,
  micIssue: '',
};

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export function useDialogue(): UseDialogue {
  const app = useApp();
  const latest = useRef(app);
  latest.current = app;

  const state = useRef<DialogueState>(initialState);
  const mounted = useRef(true);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const listenRef = useRef<() => Promise<void>>(async () => {});
  const session = useRef<RecorderSession | null>(null);
  const userCancelled = useRef(false);
  const levelTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  /** The recording of the sentence that started the current entry; attached when it is saved. */
  const pendingClip = useRef<Recording | undefined>(undefined);
  /** Extra drafts from a multi-entry utterance ("700 kaam kiya aur 200 kharchi liya"), saved/clarified in order. */
  const queuedDrafts = useRef<Draft[]>([]);
  /** Cached server STT detection so mic tap starts recording with 0ms preflight delay. */
  const cachedServerStt = useRef<'wispr' | 'sarvam' | 'browser' | null>(null);
  /** The language just heard, used straight away: the app language state only catches up on the next render. */
  const activeLang = useRef<Lang | null>(null);
  useEffect(() => {
    activeLang.current = null;
  }, [app.lang]);
  const [view, setView] = useState<DialogueView>(INITIAL_VIEW);

  const detectServerStt = useCallback(async (useWispr: boolean): Promise<'wispr' | 'sarvam' | 'browser'> => {
    if (cachedServerStt.current === 'wispr') return useWispr ? 'wispr' : 'browser';
    if (cachedServerStt.current !== null) return cachedServerStt.current;
    const wispr = await wisprConfigured();
    if (wispr) {
      cachedServerStt.current = 'wispr';
      return useWispr ? 'wispr' : 'browser';
    }
    try {
      const res = await fetch('/api/voice-health');
      if (res.ok) {
        const vh = (await res.json()) as { sarvamStt?: unknown };
        if (vh?.sarvamStt === true) {
          cachedServerStt.current = 'sarvam';
          return 'sarvam';
        }
      }
    } catch {
      // offline or mocked environment
    }
    cachedServerStt.current = 'browser';
    return 'browser';
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (canRecord()) void detectServerStt(latest.current.useWispr);
    return () => {
      mounted.current = false;
      clearTimeout(savedTimer.current);
      clearInterval(levelTimer.current);
      session.current?.cancel();
    };
  }, [detectServerStt]);

  const watchLevel = (s: RecorderSession | null) => {
    clearInterval(levelTimer.current);
    if (!s) return;
    levelTimer.current = setInterval(() => {
      if (mounted.current) setView((v) => ({ ...v, level: s.level() }));
    }, 100);
  };

  const clearSaved = useCallback(() => {
    clearTimeout(savedTimer.current);
    if (mounted.current) setView((v) => (v.saved ? { ...v, saved: null } : v));
  }, []);

  /** Runs one dialogue turn: step, persist if the user confirmed, speak, and (after voice) keep listening. */
  const run = useCallback(
    async (input: DialogueEvent, viaVoice: boolean, audio?: Recording, langOverride?: Lang) => {
      const a = latest.current;
      const lang = langOverride ?? activeLang.current ?? a.lang;
      const ctx: DialogueCtx = {
        today: localISODate(),
        lang,
        employers: a.employers,
        entries: a.entries,
        newId,
        now: Date.now,
        workerName: a.workerName,
      };

      // A new sentence starts a new entry: drop the previous "Saved" bar and show what was heard.
      if (input.type === 'heard') {
        // The clip of a fresh sentence becomes the proof for whatever it creates; answers to
        // follow-up questions ("700", "haan") do not replace it.
        if (state.current.phase === 'IDLE' || state.current.phase === 'SAVED') pendingClip.current = audio;
        clearSaved();
        if (mounted.current) setView((v) => ({ ...v, heard: input.text.trim(), whatsappText: undefined }));
      }

      let ev = input;
      // Edge mode: when the rules cannot fully understand a sentence, Sarvam 105B / local model may help.
      if (input.type === 'heard' && a.edgeMode && input.text.trim() && input.confidence >= CONFIDENCE_MIN && state.current.phase !== 'CLARIFY') {
        if (mounted.current) setView((v) => ({ ...v, thinking: true }));
        const parseCtx = { today: ctx.today, employers: a.employers.map((e) => e.name), lang };
        let parsed = await parseWithFallback(input.text, parseCtx, { enabled: true });
        if (parsed.kind === 'unknown' && new Set(moneyAmounts(input.text)).size > 1) {
          const multi = await parseMultiUtterance(input.text, parseCtx, { enabled: true });
          if (multi.length > 0) {
            parsed = { kind: 'record', draft: multi[0] };
            queuedDrafts.current = multi.slice(1);
          }
        }
        ev = { ...input, parsed };
        if (mounted.current) setView((v) => ({ ...v, thinking: false }));
      }

      const r = step(state.current, ev, ctx);
      state.current = r.state;
      if (mounted.current) {
        setView((v) => ({
          ...v,
          phase: r.state.phase,
          phrase: r.speak ?? v.phrase,
          draft: r.state.phase === 'CONFIRM' ? r.state.draft : undefined,
          action: r.state.phase === 'CONFIRM' ? r.state.action : undefined,
          clip: r.state.phase === 'CONFIRM' && r.state.draft && a.keepProof ? pendingClip.current?.blob : undefined,
          needTyping: r.needTyping ?? false,
        }));
      }

      // Persist before speaking "Saved" so the words are true.
      let saves: Entry[] = r.saves ?? (r.save ? [r.save] : []);
      if (saves.length && a.keepProof && pendingClip.current) {
        // One clip backs every day of a "3 din" sentence.
        const clipId = await saveClip(pendingClip.current.blob, pendingClip.current.durationMs);
        saves = saves.map((s) => ({ ...s, clipId }));
      }
      if (saves.length) pendingClip.current = undefined;
      let changed = false;
      if (r.newEmployer) {
        await db.employers.put(r.newEmployer);
        changed = true;
      }
      if (r.updateEmployer) {
        await db.employers.update(r.updateEmployer.id, { dailyRate: r.updateEmployer.dailyRate });
        changed = true;
      }
      if (saves.length) {
        await db.entries.bulkPut(saves);
        changed = true;
      }
      if (r.deleteEntryId) {
        await deleteEntry(r.deleteEntryId);
        changed = true;
      }
      if (changed) await a.reload();

      if (saves.length && mounted.current) {
        const first = saves[0];
        const name = r.newEmployer?.name ?? a.employers.find((e) => e.id === first.employerId)?.name ?? '';
        const label = saves.length > 1 ? `${name} · ${saves.length} × ${inr(first.amount)}` : `${name} ${inr(first.amount)}`;
        setView((v) => ({ ...v, saved: { ids: saves.map((s) => s.id), label: label.trim(), createdEmployerId: r.newEmployer?.id } }));
        clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(clearSaved, SAVED_BAR_MS);
      }
      if (r.navigate) a.openStatement(r.navigate.employerId);
      if (r.openWhatsApp && mounted.current) {
        // Show an explicit tap button so browsers never block opening WhatsApp.
        setView((v) => ({ ...v, whatsappText: r.openWhatsApp }));
      }

      // If this was a multi-entry utterance, process any remaining queued drafts directly (auto-save or clarify).
      let activePhase = r.state.phase;
      let activeNeedTyping = r.needTyping;
      while ((activePhase === 'SAVED' || activePhase === 'IDLE') && queuedDrafts.current.length > 0 && mounted.current) {
        const nextDraft = queuedDrafts.current.shift()!;
        const nextR = step(
          r.state,
          { type: 'heard', text: nextDraft.rawTranscript ?? '', confidence: 1, parsed: { kind: 'record', draft: nextDraft } },
          ctx,
        );
        state.current = nextR.state;
        activePhase = nextR.state.phase;
        activeNeedTyping = nextR.needTyping;
        const extraSaves: Entry[] = nextR.saves ?? (nextR.save ? [nextR.save] : []);
        if (nextR.newEmployer) await db.employers.put(nextR.newEmployer);
        if (nextR.updateEmployer) await db.employers.update(nextR.updateEmployer.id, { dailyRate: nextR.updateEmployer.dailyRate });
        if (extraSaves.length) {
          await db.entries.bulkPut(extraSaves);
          await a.reload();
        }
        setView((v) => ({
          ...v,
          phase: nextR.state.phase,
          phrase: nextR.speak ?? v.phrase,
          draft: nextR.state.phase === 'CONFIRM' ? nextR.state.draft : undefined,
          action: nextR.state.phase === 'CONFIRM' ? nextR.state.action : undefined,
          needTyping: nextR.needTyping ?? false,
        }));
        if (activePhase === 'CLARIFY' || activePhase === 'CONFIRM') {
          if (nextR.speak) await speak(nextR.speak, lang);
          break;
        }
      }

      // Hands-free: only await TTS when we are about to open the mic again for a follow-up answer.
      const expectsAnswer = activePhase === 'CLARIFY' || activePhase === 'CONFIRM';
      if (expectsAnswer) {
        if (r.speak) await speak(r.speak, lang);
        if (viaVoice && !activeNeedTyping && mounted.current && (isSpeechSupported() || canRecord())) {
          if (AFTER_SPEECH_GAP_MS) await new Promise<void>((res) => setTimeout(res, AFTER_SPEECH_GAP_MS));
          if (mounted.current) await listenRef.current();
        }
      } else if (r.speak) {
        void speak(r.speak, lang);
      }
    },
    [clearSaved],
  );

  type Heard = { text: string; confidence: number; audio?: Recording; lang?: Lang; langProbability?: number };

  /** Phone speech (live words), recording a proof clip alongside when possible. */
  const captureWithBrowser = async (): Promise<Heard | null> => {
    const a = latest.current;
    if (mounted.current) setView((v) => ({ ...v, engine: 'browser' }));
    let s: RecorderSession | null = null;
    if (a.keepProof && canRecord()) s = await startRecorder({ autoStop: false }).catch(() => null);
    session.current = s;
    watchLevel(s);
    try {
      const r = await listen(a.lang, { onInterim: (text) => mounted.current && setView((v) => ({ ...v, interim: text })) });
      s?.stop();
      const audio = s ? ((await s.result) ?? undefined) : undefined;
      return { ...r, audio };
    } catch (e) {
      s?.cancel();
      session.current = null;
      if (userCancelled.current) return null;
      // On some phones/desktops, holding MediaRecorder locks the mic so SpeechRecognition fires audio-capture.
      // Retry SpeechRecognition alone without simultaneous recording so voice still works cleanly.
      if (e === 'audio_busy' && s) {
        await new Promise<void>((res) => setTimeout(res, 100));
        const r = await listen(a.lang, { onInterim: (text) => mounted.current && setView((v) => ({ ...v, interim: text })) });
        return { ...r };
      }
      throw e;
    }
  };

  /** Server STT (Wispr Flow or Sarvam Saaras v4): record cleanly, then transcribe on our server. */
  const captureWithServer = async (kind: 'wispr' | 'sarvam'): Promise<Heard | null | 'failed'> => {
    const a = latest.current;
    if (mounted.current) setView((v) => ({ ...v, engine: kind }));
    // Wait out short pauses mid-sentence (1.4 s), adapt to room noise, and allow long answers.
    const s = await startRecorder({
      autoStop: true,
      silence: { threshold: 0.012, silenceMs: 1400, noSpeechMs: 10000, maxMs: 25000, adaptive: true },
    });
    session.current = s;
    watchLevel(s);
    const rec = await s.result;
    session.current = null;
    clearInterval(levelTimer.current);
    if (!rec) return s.cancelledByUser() ? null : { text: '', confidence: 0 };
    if (mounted.current) setView((v) => ({ ...v, thinking: true }));
    const heard = await transcribeRecording(rec, activeLang.current ?? a.lang, a.employers.map((e) => e.name));
    if (mounted.current) setView((v) => ({ ...v, thinking: false }));
    return heard ? { text: heard.text, confidence: 0.9, audio: rec, lang: heard.lang, langProbability: heard.langProbability } : 'failed';
  };

  const listenTurn = useCallback(async () => {
    if (!mounted.current) return;
    userCancelled.current = false;
    setView((v) => ({ ...v, listening: true, interim: '', level: 0, wisprFailed: false }));
    let heard: Heard | null;
    try {
      const a = latest.current;
      const serverKind = canRecord() ? await detectServerStt(a.useWispr) : 'browser';
      let result: Heard | null | 'failed' = serverKind !== 'browser' ? await captureWithServer(serverKind) : 'failed';
      if (result === 'failed') {
        if (userCancelled.current) result = null;
        else if (serverKind === 'sarvam') {
          // Nothing usable was heard: let the dialogue say "please say it again" in the user's language.
          result = { text: '', confidence: 0 };
        } else {
          if (serverKind === 'wispr' && mounted.current) setView((v) => ({ ...v, wisprFailed: true, phrase: a.t.wisprFallback }));
          result = await captureWithBrowser();
        }
      }
      heard = result;
    } catch (e) {
      if (!mounted.current) return;
      if (e === 'denied' || e === 'unsupported' || (e as { name?: string })?.name === 'NotAllowedError') {
        setView((v) => ({ ...v, listening: false, needTyping: true, micIssue: e === 'unsupported' ? 'unsupported' : 'denied' }));
        return;
      }
      heard = { text: '', confidence: 0 }; // silence: let the dialogue ask again
    } finally {
      clearInterval(levelTimer.current);
      session.current = null;
    }
    if (!mounted.current) return;
    setView((v) => ({ ...v, listening: false, micIssue: '', interim: '', level: 0, engine: undefined }));
    if (heard === null) return; // the user pressed Cancel
    // Reply in the language the user actually spoke (server speech engines only).
    let turnLang: Lang | undefined;
    const current = activeLang.current ?? latest.current.lang;
    if (shouldSwitchLanguage(heard.text, heard.lang, heard.langProbability, current)) {
      turnLang = heard.lang;
      activeLang.current = heard.lang!;
      latest.current.setLang(heard.lang!);
    }
    await run({ type: 'heard', text: heard.text, confidence: heard.confidence }, true, heard.audio, turnLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectServerStt, run]);
  listenRef.current = listenTurn;

  const undo = useCallback(async () => {
    const saved = view.saved;
    if (!saved) return;
    for (const id of saved.ids) await deleteEntry(id);
    // If saving created the employer and nothing else uses it, remove it too.
    if (saved.createdEmployerId) {
      const stillUsed = (await db.entries.where('employerId').equals(saved.createdEmployerId).count()) > 0;
      if (!stillUsed) await db.employers.delete(saved.createdEmployerId);
    }
    await latest.current.reload();
    state.current = initialState;
    clearTimeout(savedTimer.current);
    if (mounted.current) setView((v) => ({ ...v, saved: null, phase: 'IDLE', phrase: '', heard: '', draft: undefined, action: undefined }));
  }, [view.saved]);

  return {
    ...view,
    // The mic works with phone speech, or with any browser that can record (for Wispr Flow).
    supported: isSpeechSupported() || canRecord(),
    start: () => void listenTurn(),
    typed: (text) => run({ type: 'heard', text, confidence: 1 }, false),
    yes: () => void run({ type: 'tap_yes' }, false),
    no: () => void run({ type: 'tap_no' }, false),
    undo,
    dismissWhatsApp: () => setView((v) => ({ ...v, whatsappText: undefined })),
    stopListening: () => {
      if (session.current && (view.engine === 'wispr' || view.engine === 'sarvam')) session.current.stop();
      else stopListening();
    },
    cancelListening: () => {
      userCancelled.current = true;
      session.current?.cancel();
      abortListening();
    },
  };
}
