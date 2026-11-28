import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { COMMAND_EXAMPLES } from '../i18n/examples';
import ActionCard from './ActionCard';
import { useApp } from './AppContext';
import ConfirmCard from './ConfirmCard';
import ListeningOverlay from './ListeningOverlay';
import { whatsappUrl, type UseDialogue } from './useDialogue';

function MicSvg() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-16 w-16 fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2.5" width="6" height="11" rx="3" fill="currentColor" fillOpacity="0.22" />
      <path d="M5 10.5a7 7 0 0 0 14 0" />
      <path d="M12 17.5v4" />
      <path d="M8.5 21.5h7" />
    </svg>
  );
}

/** Voice actions, what was heard and said, confirmation card, Saved bar, and clean phrase list. */
export default function VoicePanel({ d }: { d: UseDialogue }) {
  const { t, lang, edgeMode } = useApp();
  const [text, setText] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // On a small screen the answer can sit below the fold: bring the thing the user must act on into view.
  useEffect(() => {
    if (d.phase === 'CONFIRM') cardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [d.phase]);
  useEffect(() => {
    if (d.saved) savedRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [d.saved]);

  const showTyping = !d.supported || d.needTyping || d.micIssue !== '';
  const busy = d.listening || d.thinking;

  const sendValue = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (!v) return;
      setText('');
      void d.typed(v);
    },
    [d],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    sendValue(text);
  };

  return (
    <section className="flex flex-col gap-3.5">
      {(d.listening || (d.thinking && (d.engine === 'wispr' || d.engine === 'sarvam'))) && <ListeningOverlay d={d} />}
      {!d.supported && (
        <p role="status" className="w-full rounded-2xl border border-[#F2D08A] bg-[#FEF3C7] px-4 py-2.5 text-center text-sm font-semibold text-[#92400E]">
          {t.typeBanner}
        </p>
      )}
      {d.micIssue === 'denied' && (
        <p role="alert" className="w-full rounded-2xl border border-[#F3B8B0] bg-[#FDECEA] px-4 py-2.5 text-center text-sm font-semibold text-[#B42318]">
          {t.micDenied}
        </p>
      )}

      {/* The hero: one huge microphone */}
      <div className="flex flex-col items-center gap-3 py-2">
        {d.supported && (
          <button
            type="button"
            aria-label={t.tapToSpeak}
            onClick={d.start}
            disabled={busy}
            className={`mic ${d.listening ? 'mic-listening' : d.thinking ? 'mic-thinking animate-pulse' : ''}`}
          >
            {d.listening && <span aria-hidden="true" className="mic-ring" />}
            <MicSvg />
          </button>
        )}
        <p className="text-lg font-extrabold text-[#1C1917]">{d.thinking ? t.thinking : d.listening ? t.listening : d.supported ? t.tapToSpeak : ''}</p>
        {edgeMode && <span className="pill bg-[#F3ECDD] text-[#6B6259]">✨ Sarvam 105B</span>}
      </div>

      {d.heard && d.phase !== 'SAVED' && (
        <p data-testid="heard" className="card-enter row w-full px-4 py-3 text-base text-[#1C1917]">
          <span className="font-bold text-[#C2570C]">{t.youSaid}:</span> “{d.heard}”
        </p>
      )}

      {d.phrase && !d.saved && (
        <p
          aria-live="polite"
          className={`card-enter w-full ${
            d.phase === 'CONFIRM' ? 'text-center text-base font-medium text-[#6B6259]' : 'card p-4 text-lg font-bold text-[#1C1917]'
          }`}
        >
          <span aria-hidden="true">🔊 </span>
          {d.phrase}
        </p>
      )}

      {d.phase === 'CONFIRM' && (d.draft || d.action) && (
        <div ref={cardRef} className="card-enter w-full scroll-mt-4">
          {d.action ? <ActionCard action={d.action} onYes={d.yes} onNo={d.no} /> : <ConfirmCard draft={d.draft!} clip={d.clip} onYes={d.yes} onNo={d.no} />}
        </div>
      )}

      {d.whatsappText && (
        <a
          href={whatsappUrl(d.whatsappText)}
          target="_blank"
          rel="noopener"
          onClick={d.dismissWhatsApp}
          className="card-enter btn btn-primary h-14 w-full text-base"
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
          className="card-enter flex w-full items-center justify-between gap-3 rounded-full bg-[#E6F4EA] px-4 py-2 text-[#166534] ring-1 ring-[#BFE3C8]"
        >
          <span className="min-w-0 truncate text-sm font-extrabold">
            <span aria-hidden="true">✓ </span>
            {t.savedShort} · {d.saved.label}
          </span>
          <button
            type="button"
            onClick={() => void d.undo()}
            className="btn h-11 shrink-0 bg-white px-4 text-sm text-[#166534] ring-1 ring-[#BFE3C8]"
          >
            {t.undo}
          </button>
        </div>
      )}

      {showTyping && (
        <div className="card-enter flex w-full flex-col gap-2">
          <form onSubmit={submit} className="flex w-full gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.typeHere}
              aria-label={t.typeHere}
              className="input min-w-0 flex-1 rounded-full placeholder:text-[#9C9183]"
            />
            <button type="submit" className="btn btn-primary px-5">
              {t.send}
            </button>
          </form>
        </div>
      )}

      {d.phase === 'IDLE' && (
        <section className="flex flex-col gap-3 pt-1">
          <div>
            <h2 className="eyebrow mb-2">{t.commandsTitle}</h2>
            <ul data-testid="command-chips" className="flex flex-wrap gap-1.5">
              {COMMAND_EXAMPLES[lang].map((c, i) => (
                <li key={c}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void d.typed(c)}
                    className="rounded-full border border-[#EADFCB] bg-white px-3.5 py-2 text-sm font-semibold text-[#1C1917] transition hover:border-[#D3C1A0] disabled:opacity-50"
                  >
                    <span aria-hidden="true">{['📄', '📲', '↩️', '⭐'][i]} </span>“{c}”
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

    </section>
  );
}
