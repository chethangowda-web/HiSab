import { useCallback, useEffect, useRef, useState } from 'react';
import { addEntry, db, deleteEntry, newId } from '../db/db';
import { localISODate } from '../domain/dates';
import type { Draft } from '../domain/types';
import { inr } from '../i18n/ui';
import { parseWithFallback } from '../nlu/llmParser';
import { CONFIDENCE_MIN, initialState, step, type DialogueCtx, type DialogueEvent, type DialogueState, type Phase } from '../voice/dialogue';
import { isSpeechSupported, listen } from '../voice/speechInput';
import { speak } from '../voice/speechOutput';
import { useApp } from './AppContext';

/** How long the "Saved · Undo" bar stays on screen. */
const SAVED_BAR_MS = 8000;

export interface SavedInfo {
  id: string;
  /** e.g. "Ramesh ₹500" */
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
  /** The entry waiting for a yes/no (only in the CONFIRM phase). */
  draft?: Draft;
  /** The entry just saved, until the bar times out or the next entry starts. */
  saved: SavedInfo | null;
  listening: boolean;
  /** Waiting for the optional local model. */
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
  /** Removes the entry that was just saved. */
  undo(): Promise<void>;
}

const INITIAL_VIEW: DialogueView = {
  phase: 'IDLE',
  phrase: '',
  heard: '',
  saved: null,
  listening: false,
  thinking: false,
  needTyping: false,
  micIssue: '',
};

export function useDialogue(): UseDialogue {
  const app = useApp();
  const latest = useRef(app);
  latest.current = app;

  const state = useRef<DialogueState>(initialState);
  const mounted = useRef(true);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const listenRef = useRef<() => Promise<void>>(async () => {});
  const [view, setView] = useState<DialogueView>(INITIAL_VIEW);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(savedTimer.current);
    };
  }, []);

  const clearSaved = useCallback(() => {
    clearTimeout(savedTimer.current);
    if (mounted.current) setView((v) => (v.saved ? { ...v, saved: null } : v));
  }, []);

  /** Runs one dialogue turn: step, persist if the user confirmed, speak, and (after voice) keep listening. */
  const run = useCallback(
    async (input: DialogueEvent, viaVoice: boolean) => {
      const a = latest.current;
      const ctx: DialogueCtx = {
        today: localISODate(),
        lang: a.lang,
        employers: a.employers,
        entries: a.entries,
        newId,
        now: Date.now,
      };

      // A new sentence starts a new entry: drop the previous "Saved" bar and show what was heard.
      if (input.type === 'heard') {
        clearSaved();
        if (mounted.current) setView((v) => ({ ...v, heard: input.text.trim() }));
      }

      let ev = input;
      // Edge mode: when the rules cannot fully understand a sentence, a local model may help.
      // It is never consulted while answering a clarifying question.
      if (
        input.type === 'heard' &&
        a.edgeMode &&
        input.text.trim() &&
        input.confidence >= CONFIDENCE_MIN &&
        state.current.phase !== 'CLARIFY'
      ) {
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
          needTyping: r.needTyping ?? false,
        }));
      }

      // Persist before speaking "Saved" so the words are true.
      // In demo mode everything created is flagged, so it can never mix with real records.
      const flag = a.demoMode ? { demo: true } : {};
      if (r.newEmployer) await db.employers.put({ ...r.newEmployer, ...flag });
      if (r.save) {
        await addEntry({ ...r.save, ...flag });
        await a.reload();
        const name = r.newEmployer?.name ?? a.employers.find((e) => e.id === r.save!.employerId)?.name ?? '';
        const saved: SavedInfo = {
          id: r.save.id,
          label: `${name} ${inr(r.save.amount)}`.trim(),
          createdEmployerId: r.newEmployer?.id,
        };
        if (mounted.current) {
          setView((v) => ({ ...v, saved }));
          clearTimeout(savedTimer.current);
          savedTimer.current = setTimeout(clearSaved, SAVED_BAR_MS);
        }
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

  const listenTurn = useCallback(async () => {
    if (!mounted.current) return;
    setView((v) => ({ ...v, listening: true }));
    let heard: { text: string; confidence: number };
    try {
      heard = await listen(latest.current.lang);
    } catch (e) {
      if (!mounted.current) return;
      if (e === 'denied' || e === 'unsupported') {
        setView((v) => ({ ...v, listening: false, needTyping: true, micIssue: e }));
        return;
      }
      heard = { text: '', confidence: 0 }; // silence: let the dialogue ask again
    }
    if (!mounted.current) return;
    setView((v) => ({ ...v, listening: false, micIssue: '' }));
    await run({ type: 'heard', ...heard }, true);
  }, [run]);
  listenRef.current = listenTurn;

  const undo = useCallback(async () => {
    const saved = view.saved;
    if (!saved) return;
    await deleteEntry(saved.id);
    // If saving created the employer and nothing else uses it, remove it too.
    if (saved.createdEmployerId) {
      const stillUsed = (await db.entries.where('employerId').equals(saved.createdEmployerId).count()) > 0;
      if (!stillUsed) await db.employers.delete(saved.createdEmployerId);
    }
    await latest.current.reload();
    state.current = initialState;
    clearTimeout(savedTimer.current);
    if (mounted.current) setView((v) => ({ ...v, saved: null, phase: 'IDLE', phrase: '', heard: '', draft: undefined }));
  }, [view.saved]);

  return {
    ...view,
    supported: isSpeechSupported(),
    start: () => void listenTurn(),
    typed: (text) => run({ type: 'heard', text, confidence: 1 }, false),
    yes: () => void run({ type: 'tap_yes' }, false),
    no: () => void run({ type: 'tap_no' }, false),
    undo,
  };
}
