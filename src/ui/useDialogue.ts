import { useCallback, useEffect, useRef, useState } from 'react';
import { db, deleteEntry, newId } from '../db/db';
import { localISODate } from '../domain/dates';
import type { Draft, Entry } from '../domain/types';
import { inr } from '../i18n/ui';
import { parseWithFallback } from '../nlu/llmParser';
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
import { canRecord, startRecorder, type Recording, type RecorderSession } from '../voice/recorder';
import { abortListening, isSpeechSupported, listen, stopListening } from '../voice/speechInput';
import { speak } from '../voice/speechOutput';
import { useApp } from './AppContext';

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
  engine?: 'wispr' | 'browser';
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
  const [view, setView] = useState<DialogueView>(INITIAL_VIEW);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(savedTimer.current);
      clearInterval(levelTimer.current);
      session.current?.cancel();
    };
  }, []);

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
    async (input: DialogueEvent, viaVoice: boolean, audio?: Recording) => {
      const a = latest.current;
      const ctx: DialogueCtx = {
        today: localISODate(),
        lang: a.lang,
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
      // Edge mode: when the rules cannot fully understand a sentence, a local model may help.
      if (input.type === 'heard' && a.edgeMode && input.text.trim() && input.confidence >= CONFIDENCE_MIN && state.current.phase !== 'CLARIFY') {
        if (mounted.current) setView((v) => ({ ...v, thinking: true }));
        const parsed = await parseWithFallback(
          input.text,
          { today: ctx.today, employers: a.employers.map((e) => e.name), lang: a.lang },
          { enabled: true },
        );
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
      // In demo mode everything created is flagged, so it can never mix with real records.
      const flag = a.demoMode ? { demo: true } : {};
      let saves: Entry[] = r.saves ?? (r.save ? [r.save] : []);
      if (saves.length && a.keepProof && pendingClip.current) {
        // One clip backs every day of a "3 din" sentence.
        const clipId = await saveClip(pendingClip.current.blob, pendingClip.current.durationMs, { demo: a.demoMode });
        saves = saves.map((s) => ({ ...s, clipId }));
      }
      if (saves.length) pendingClip.current = undefined;
      let changed = false;
      if (r.newEmployer) {
        await db.employers.put({ ...r.newEmployer, ...flag });
        changed = true;
      }
      if (r.updateEmployer) {
        await db.employers.update(r.updateEmployer.id, { dailyRate: r.updateEmployer.dailyRate });
        changed = true;
      }
      if (saves.length) {
        await db.entries.bulkPut(saves.map((s) => ({ ...s, ...flag })));
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
      if (r.openWhatsApp && viaVoice && mounted.current) {
        // No tap happened, so the browser may block a pop-up: offer a button instead.
        setView((v) => ({ ...v, whatsappText: r.openWhatsApp }));
      }

      if (r.speak) await speak(r.speak, a.lang);
      // Hands-free: after a spoken turn that expects an answer, listen again.
      const expectsAnswer = r.state.phase === 'CLARIFY' || r.state.phase === 'CONFIRM';
      if (viaVoice && expectsAnswer && !r.needTyping && mounted.current && isSpeechSupported()) {
        await listenRef.current();
      }
    },
    [clearSaved],
  );

  type Heard = { text: string; confidence: number; audio?: Recording };

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
      if (userCancelled.current) return null;
      throw e;
    }
  };

  /** Wispr Flow: record (auto-stops after the user finishes), then transcribe on our server. */
  const captureWithWispr = async (): Promise<Heard | null | 'failed'> => {
    const a = latest.current;
    if (mounted.current) setView((v) => ({ ...v, engine: 'wispr' }));
    const s = await startRecorder({ autoStop: true });
    session.current = s;
    watchLevel(s);
    const rec = await s.result;
    session.current = null;
    clearInterval(levelTimer.current);
    if (!rec) return s.cancelledByUser() ? null : { text: '', confidence: 0 };
    if (mounted.current) setView((v) => ({ ...v, thinking: true }));
    const text = await transcribeRecording(rec, a.lang, a.employers.map((e) => e.name));
    if (mounted.current) setView((v) => ({ ...v, thinking: false }));
    // Wispr gives no confidence score; the read-back and yes/no step protect against mis-hearing.
    return text ? { text, confidence: 0.9, audio: rec } : 'failed';
  };

  const listenTurn = useCallback(async () => {
    if (!mounted.current) return;
    userCancelled.current = false;
    setView((v) => ({ ...v, listening: true, interim: '', level: 0, wisprFailed: false }));
    let heard: Heard | null;
    try {
      const a = latest.current;
      const wispr = a.useWispr && canRecord() && (await wisprConfigured());
      let result: Heard | null | 'failed' = wispr ? await captureWithWispr() : 'failed';
      if (result === 'failed') {
        if (wispr && mounted.current) setView((v) => ({ ...v, wisprFailed: true, phrase: a.t.wisprFallback }));
        result = userCancelled.current ? null : await captureWithBrowser();
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
    await run({ type: 'heard', text: heard.text, confidence: heard.confidence }, true, heard.audio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
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
      if (session.current && view.engine === 'wispr') session.current.stop();
      else stopListening();
    },
    cancelListening: () => {
      userCancelled.current = true;
      session.current?.cancel();
      abortListening();
    },
  };
}
