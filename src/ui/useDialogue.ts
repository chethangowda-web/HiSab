import { useCallback, useEffect, useRef, useState } from 'react';
import { addEntry, db, newId } from '../db/db';
import { localISODate } from '../domain/dates';
import { initialState, step, type DialogueCtx, type DialogueEvent, type DialogueState, type Phase } from '../voice/dialogue';
import { isSpeechSupported, listen } from '../voice/speechInput';
import { speak } from '../voice/speechOutput';
import { useApp } from './AppContext';

export interface DialogueView {
  phase: Phase;
  /** The last thing the app said, shown on screen as well as spoken. */
  phrase: string;
  listening: boolean;
  /** Voice keeps failing: offer typed input. */
  needTyping: boolean;
  /** Set when the microphone cannot be used at all. */
  micIssue: '' | 'denied' | 'unsupported';
}

export interface UseDialogue extends DialogueView {
  supported: boolean;
  start(): void;
  typed(text: string): void;
  yes(): void;
  no(): void;
}

export function useDialogue(): UseDialogue {
  const app = useApp();
  const latest = useRef(app);
  latest.current = app;

  const state = useRef<DialogueState>(initialState);
  const mounted = useRef(true);
  const listenRef = useRef<() => Promise<void>>(async () => {});
  const [view, setView] = useState<DialogueView>({ phase: 'IDLE', phrase: '', listening: false, needTyping: false, micIssue: '' });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Runs one dialogue turn: step, persist if the user confirmed, speak, and (after voice) keep listening. */
  const run = useCallback(async (ev: DialogueEvent, viaVoice: boolean) => {
    const a = latest.current;
    const ctx: DialogueCtx = {
      today: localISODate(),
      lang: a.lang,
      employers: a.employers,
      entries: a.entries,
      newId,
      now: Date.now,
    };
    const r = step(state.current, ev, ctx);
    state.current = r.state;
    if (mounted.current) {
      setView((v) => ({ ...v, phase: r.state.phase, phrase: r.speak ?? v.phrase, needTyping: r.needTyping ?? false }));
    }
    // Persist before speaking "Saved" so the words are true.
    if (r.newEmployer) await db.employers.put(r.newEmployer);
    if (r.save) {
      await addEntry(r.save);
      await a.reload();
    }
    if (r.speak) await speak(r.speak, a.lang);
    // Hands-free: after a spoken turn that expects an answer, listen again.
    const expectsAnswer = r.state.phase === 'CLARIFY' || r.state.phase === 'CONFIRM';
    if (viaVoice && expectsAnswer && !r.needTyping && mounted.current && isSpeechSupported()) {
      await listenRef.current();
    }
  }, []);

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

  return {
    ...view,
    supported: isSpeechSupported(),
    start: () => void listenTurn(),
    typed: (text) => void run({ type: 'heard', text, confidence: 1 }, false),
    yes: () => void run({ type: 'tap_yes' }, false),
    no: () => void run({ type: 'tap_no' }, false),
  };
}
