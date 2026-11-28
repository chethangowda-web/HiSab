import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { COMMAND_EXAMPLES, EXAMPLES } from '../i18n/examples';
import ActionCard from './ActionCard';
import { useApp } from './AppContext';
import ConfirmCard from './ConfirmCard';
import ListeningOverlay from './ListeningOverlay';
import { whatsappUrl, type UseDialogue } from './useDialogue';

function MicSvg() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
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
        <p role="status" className="w-full rounded-2xl border border-[#44561D] bg-[#18220D] px-4 py-2.5 text-center text-sm font-semibold text-[#E8FC98]">
          {t.typeBanner}
        </p>
      )}
      {d.micIssue === 'denied' && (
        <p role="alert" className="w-full rounded-2xl border border-rose-500/40 bg-rose-950/70 px-4 py-2.5 text-center text-sm font-semibold text-rose-200">
          {t.micDenied}
        </p>
      )}

      {/* Sleek horizontal action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {d.supported && (
          <button
            type="button"
            aria-label={t.tapToSpeak}
            onClick={d.start}
            disabled={busy}
            className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition active:scale-95 ${
              d.listening
                ? 'bg-rose-600 text-white'
                : d.thinking
                  ? 'animate-pulse bg-amber-300 text-[#0B1307]'
                  : 'bg-[#C9F43A] text-[#0B1307] shadow-sm hover:brightness-105'
            }`}
          >
            <MicSvg />
            <span>{d.thinking ? t.thinking : d.listening ? t.listening : t.tapToSpeak}</span>
          </button>
        )}
        {edgeMode && (
          <span className="ml-auto rounded-full bg-[#182610] px-2.5 py-1 text-[11px] font-bold text-[#C9F43A]">
            ✨ Sarvam 105B
          </span>
        )}
      </div>

      {d.heard && d.phase !== 'SAVED' && (
        <p data-testid="heard" className="card-enter w-full rounded-2xl bg-[#14200D] px-4 py-2.5 text-sm text-[#E5F0D8]">
          <span className="font-bold text-[#C9F43A]">{t.youSaid}:</span> “{d.heard}”
        </p>
      )}

      {d.phrase && !d.saved && (
        <p
          aria-live="polite"
          className={`card-enter w-full ${
            d.phase === 'CONFIRM' ? 'text-center text-sm font-medium text-[#9BB08B]' : 'rounded-2xl border border-[#293E1D] bg-[#15200E] p-3.5 text-base font-bold text-[#F3F7EC]'
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
          className="card-enter flex h-14 w-full items-center justify-center rounded-full bg-[#C9F43A] text-base font-extrabold text-[#0B1307] shadow-lg transition active:scale-[0.98]"
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
          className="card-enter flex w-full items-center justify-between gap-3 rounded-full bg-[#C9F43A] px-4 py-2 text-[#0B1307] shadow-lg"
        >
          <span className="min-w-0 truncate text-sm font-extrabold">
            <span aria-hidden="true">✓ </span>
            {t.savedShort} · {d.saved.label}
          </span>
          <button
            type="button"
            onClick={() => void d.undo()}
            className="h-9 shrink-0 rounded-full bg-[#0B1307] px-3.5 text-xs font-bold text-[#D9F76E] transition active:scale-95"
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
              className="h-12 min-w-0 flex-1 rounded-full border border-[#314A22] bg-[#14200D] px-4 text-base text-[#F3F7EC] placeholder:text-[#7E9270] focus:border-[#C9F43A] focus:outline-none"
            />
            <button type="submit" className="h-12 rounded-full bg-[#C9F43A] px-5 text-sm font-extrabold text-[#0B1307] shadow-sm transition active:scale-95">
              {t.send}
            </button>
          </form>
        </div>
      )}

      {d.phase === 'IDLE' && (
        <section className="flex flex-col gap-3 pt-1">
          <div>
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#8EA37D]">{t.examplesTitle}</h2>
            <ul className="divide-y divide-[#1D2D13] rounded-2xl bg-[#131E0C]">
              {EXAMPLES[lang].map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void d.typed(e)}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm font-medium text-[#EAF4DC] transition hover:bg-[#192810] disabled:opacity-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1E3014] text-xs text-[#C9F43A]">
                        💬
                      </span>
                      <span className="min-w-0">{e}</span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-[#7E9270]">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#8EA37D]">{t.commandsTitle}</h2>
            <ul data-testid="command-chips" className="flex flex-wrap gap-1.5">
              {COMMAND_EXAMPLES[lang].map((c, i) => (
                <li key={c}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void d.typed(c)}
                    className="rounded-full bg-[#15220E] px-3 py-1.5 text-xs font-semibold text-[#C9E3A4] transition hover:bg-[#1E3014] disabled:opacity-50"
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
