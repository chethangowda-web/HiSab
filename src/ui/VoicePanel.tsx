import { useState, type FormEvent } from 'react';
import { useApp } from './AppContext';
import { SAMPLES } from './samples';
import { useDialogue } from './useDialogue';

/** Pause between scripted demo lines so a viewer can read each reply (no pause under test). */
const PAUSE_MS = import.meta.env.MODE === 'test' ? 0 : 900;
const pause = () => new Promise<void>((r) => setTimeout(r, PAUSE_MS));

/** The mic button, what the app is saying, yes/no buttons, and the typed fallback. */
export default function VoicePanel() {
  const { t, lang, demoMode } = useApp();
  const d = useDialogue();
  const [text, setText] = useState('');
  const [playing, setPlaying] = useState(false);

  const showTyping = !d.supported || d.needTyping || d.micIssue !== '';
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    void d.typed(v);
    setText('');
  };

  /** Feeds the canned script through the real dialogue: record, confirm, then ask the balance. */
  const playSample = async () => {
    setPlaying(true);
    try {
      for (const line of SAMPLES[lang]) {
        await d.typed(line);
        await pause(); // lets the screen refresh before the next line reads the ledger
      }
    } finally {
      setPlaying(false);
    }
  };

  return (
    <section className="flex flex-col items-center gap-4">
      {!d.supported && (
        <p role="status" className="rounded-xl bg-amber-100 px-4 py-3 text-center text-amber-900">
          {t.typeBanner}
        </p>
      )}
      {d.micIssue === 'denied' && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-center text-red-900">
          {t.micDenied}
        </p>
      )}

      {d.supported && (
        <button
          type="button"
          aria-label={t.tapToSpeak}
          onClick={d.start}
          disabled={d.listening}
          className={`flex h-28 w-28 items-center justify-center rounded-full text-5xl text-white shadow-lg transition ${
            d.listening ? 'animate-pulse bg-red-600' : 'bg-teal-700 active:scale-95'
          }`}
        >
          <span aria-hidden="true">🎤</span>
        </button>
      )}
      {d.supported && <p className="text-slate-600">{d.thinking ? t.thinking : d.listening ? t.listening : t.tapToSpeak}</p>}

      {d.phrase && (
        <p aria-live="polite" className="max-w-md rounded-2xl bg-white p-4 text-center text-xl shadow">
          {d.phrase}
        </p>
      )}

      {d.phase === 'CONFIRM' && (
        <div className="flex gap-4">
          <button type="button" onClick={d.yes} className="h-14 min-w-28 rounded-xl bg-teal-700 px-6 text-xl font-semibold text-white">
            {t.yes}
          </button>
          <button type="button" onClick={d.no} className="h-14 min-w-28 rounded-xl bg-slate-300 px-6 text-xl font-semibold text-slate-900">
            {t.no}
          </button>
        </div>
      )}

      {showTyping && (
        <form onSubmit={submit} className="flex w-full max-w-md gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.typeHere}
            aria-label={t.typeHere}
            className="h-14 min-w-0 flex-1 rounded-xl border border-slate-300 px-4 text-xl"
          />
          <button type="submit" className="h-14 rounded-xl bg-teal-700 px-5 text-xl font-semibold text-white">
            {t.send}
          </button>
        </form>
      )}

      {demoMode && (
        <button
          type="button"
          onClick={() => void playSample()}
          disabled={playing}
          className="h-14 rounded-xl border-2 border-dashed border-amber-600 px-6 text-xl font-semibold text-amber-800 disabled:opacity-50"
        >
          ▶ {t.playSample}
        </button>
      )}
    </section>
  );
}
