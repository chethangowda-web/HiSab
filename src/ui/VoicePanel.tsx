import { useEffect, useRef, useState, type FormEvent } from 'react';
import { COMMAND_EXAMPLES, EXAMPLES } from '../i18n/examples';
import ActionCard from './ActionCard';
import { useApp } from './AppContext';
import ConfirmCard from './ConfirmCard';
import { SAMPLES } from './samples';
import { whatsappUrl, type UseDialogue } from './useDialogue';

/** Pause between scripted demo lines so a viewer can read each reply and the confirm card (no pause under test). */
const PAUSE_MS = import.meta.env.MODE === 'test' ? 0 : 2200;
const pause = () => new Promise<void>((r) => setTimeout(r, PAUSE_MS));

/** The mic, what the app heard and said, the confirm card, the Saved bar, and the typed fallback. */
export default function VoicePanel({ d }: { d: UseDialogue }) {
  const { t, lang, demoMode } = useApp();
  const [text, setText] = useState('');
  const [playing, setPlaying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<HTMLDivElement>(null);

  // On a small screen the answer can sit below the fold: bring the thing the user must act on into view.
  useEffect(() => {
    if (d.phase === 'CONFIRM') cardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [d.phase]);
  useEffect(() => {
    if (d.saved) savedRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [d.saved]);

  const showTyping = !d.supported || d.needTyping || d.micIssue !== '';
  const busy = d.listening || d.thinking;
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
        <p role="status" className="w-full rounded-2xl bg-amber-100 px-4 py-3 text-center text-amber-900">
          {t.typeBanner}
        </p>
      )}
      {d.micIssue === 'denied' && (
        <p role="alert" className="w-full rounded-2xl bg-red-100 px-4 py-3 text-center text-red-900">
          {t.micDenied}
        </p>
      )}

      {d.supported && (
        <div className="relative mt-1">
          {d.listening && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-red-400/60" />}
          <button
            type="button"
            aria-label={t.tapToSpeak}
            onClick={d.start}
            disabled={busy}
            className={`relative flex h-28 w-28 items-center justify-center rounded-full text-5xl text-white shadow-xl transition focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-teal-600 ${
              d.listening ? 'bg-red-600' : d.thinking ? 'animate-pulse bg-amber-600' : 'bg-teal-700 active:scale-95'
            }`}
          >
            <span aria-hidden="true">🎤</span>
          </button>
        </div>
      )}
      {d.supported && (
        <p className={`text-lg font-semibold ${d.listening ? 'text-red-700' : 'text-slate-600'}`}>
          {d.thinking ? t.thinking : d.listening ? t.listening : t.tapToSpeak}
        </p>
      )}

      {d.heard && d.phase !== 'SAVED' && (
        <p data-testid="heard" className="w-full rounded-2xl bg-slate-100 px-4 py-2 text-center text-slate-700">
          <span className="font-semibold">{t.youSaid}:</span> “{d.heard}”
        </p>
      )}

      {d.phrase && !d.saved && (
        <p aria-live="polite" className={`w-full text-center ${d.phase === 'CONFIRM' ? 'text-base text-slate-500' : 'rounded-2xl bg-white p-4 text-xl shadow-sm ring-1 ring-slate-200'}`}>
          <span aria-hidden="true">🔊 </span>
          {d.phrase}
        </p>
      )}

      {d.phase === 'CONFIRM' && (d.draft || d.action) && (
        <div ref={cardRef} className="w-full scroll-mt-4">
          {d.action ? <ActionCard action={d.action} onYes={d.yes} onNo={d.no} /> : <ConfirmCard draft={d.draft!} onYes={d.yes} onNo={d.no} />}
        </div>
      )}

      {d.whatsappText && (
        <a
          href={whatsappUrl(d.whatsappText)}
          target="_blank"
          rel="noopener"
          onClick={d.dismissWhatsApp}
          className="flex h-16 w-full items-center justify-center rounded-2xl bg-[#25d366] text-xl font-bold text-white shadow-lg"
        >
          <span aria-hidden="true">📲 </span>
          {t.openWhatsApp}
        </a>
      )}

      {d.saved && (
        <div
          ref={savedRef}
          data-testid="saved-bar"
          role="status"
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-teal-800 px-4 py-3 text-white shadow-lg"
        >
          <span className="min-w-0 truncate text-lg">
            <span aria-hidden="true">✓ </span>
            <span className="font-bold">{t.savedShort}</span> · {d.saved.label}
          </span>
          <button
            type="button"
            onClick={() => void d.undo()}
            className="h-12 shrink-0 rounded-xl bg-white/20 px-4 text-lg font-bold underline-offset-4 hover:underline active:bg-white/30"
          >
            {t.undo}
          </button>
        </div>
      )}

      {showTyping && (
        <form onSubmit={submit} className="flex w-full gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.typeHere}
            aria-label={t.typeHere}
            className="h-14 min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-4 text-xl"
          />
          <button type="submit" className="h-14 rounded-2xl bg-teal-700 px-5 text-xl font-bold text-white active:bg-teal-800">
            {t.send}
          </button>
        </form>
      )}

      {d.phase === 'IDLE' && (
        <section className="w-full rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 text-base font-bold text-slate-600">{t.examplesTitle}</h2>
          <ul className="flex flex-col gap-2">
            {EXAMPLES[lang].map((e) => (
              <li key={e} className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2 text-lg">
                <span aria-hidden="true">💬</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
          <h2 className="mb-2 mt-4 text-base font-bold text-slate-600">{t.commandsTitle}</h2>
          <ul data-testid="command-chips" className="flex flex-wrap gap-2">
            {COMMAND_EXAMPLES[lang].map((c, i) => (
              <li key={c} className="rounded-full bg-teal-50 px-3 py-1.5 text-base text-teal-900 ring-1 ring-teal-200">
                <span aria-hidden="true">{['📄', '📲', '↩️', '⭐'][i]} </span>“{c}”
              </li>
            ))}
          </ul>
        </section>
      )}

      {demoMode && (
        <button
          type="button"
          onClick={() => void playSample()}
          disabled={playing}
          className="h-14 rounded-2xl border-2 border-dashed border-amber-600 px-6 text-xl font-bold text-amber-800 disabled:opacity-50"
        >
          ▶ {t.playSample}
        </button>
      )}
    </section>
  );
}
