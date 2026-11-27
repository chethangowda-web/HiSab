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
import { isSpeechSupported, listen } from '../voice/speechInput';
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
  /** Removes the entries that were just saved. */
  undo(): Promise<void>;
  dismissWhatsApp(): void;
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

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

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
        workerName: a.workerName,
      };

      // A new sentence starts a new entry: drop the previous "Saved" bar and show what was heard.
      if (input.type === 'heard') {
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
          needTyping: r.needTyping ?? false,
        }));
      }

      // Persist before speaking "Saved" so the words are true.
      // In demo mode everything created is flagged, so it can never mix with real records.
      const flag = a.demoMode ? { demo: true } : {};
      const saves: Entry[] = r.saves ?? (r.save ? [r.save] : []);
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
    supported: isSpeechSupported(),
    start: () => void listenTurn(),
    typed: (text) => run({ type: 'heard', text, confidence: 1 }, false),
    yes: () => void run({ type: 'tap_yes' }, false),
    no: () => void run({ type: 'tap_no' }, false),
    undo,
    dismissWhatsApp: () => setView((v) => ({ ...v, whatsappText: undefined })),
  };
}
