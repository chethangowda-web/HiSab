import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { Lang } from '../domain/types';
import { COMMAND_EXAMPLES } from '../i18n/examples';
import ActionCard from './ActionCard';
import { useApp } from './AppContext';
import ConfirmCard from './ConfirmCard';
import ListeningOverlay from './ListeningOverlay';
import { whatsappUrl, type UseDialogue } from './useDialogue';

const STARTER_LOGS: Record<Lang, [string, string]> = {
  'en-IN': ['Worked for Ramesh today 700', 'Ramesh gave me 500 advance'],
  'hi-IN': ['आज रमेश के साइट पर 700 रुपये काम किया', 'रमेश ने 500 रुपये एडवांस दिए'],
  'kn-IN': ['ರಮೇಶ್ ಅವರ ಸೈಟ್‌ನಲ್ಲಿ 700 ರೂಪಾಯಿ ಕೆಲಸ ಮಾಡಿದೆ', 'ರಮೇಶ್ 500 ರೂಪಾಯಿ ಮುಂಗಡ ಕೊಟ್ಟರು'],
};

const STARTER_TITLE: Record<Lang, string> = {
  'en-IN': 'Try logging a workday',
  'hi-IN': 'पहले एक काम बोलकर देखें',
  'kn-IN': 'ಮೊದಲ ದಾಖಲೆ ಪ್ರಯತ್ನಿಸಿ',
};

function MicSvg({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-none stroke-current`} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2.5" width="6" height="11" rx="3" fill="currentColor" fillOpacity="0.28" />
      <path d="M5 10.5a7 7 0 0 0 14 0" />
      <path d="M12 17.5v4" />
      <path d="M8.5 21.5h7" />
    </svg>
  );
}

function ChipIcon({ idx }: { idx: number }) {
  switch (idx % 4) {
    case 0:
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#A78BFA]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="3" width="14" height="18" rx="2.5" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );
    case 1:
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#FF5FA2]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2 11 13" />
          <path d="m22 2-7 20-4-9-9-4Z" />
        </svg>
      );
    case 2:
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#FF9A4D]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#38BDF8]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.5 14.9 8.5 21.5 9.4 16.7 14 17.9 20.5 12 17.4 6.1 20.5 7.3 14 2.5 9.4 9.1 8.5Z" />
        </svg>
      );
  }
}

const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Feedback stack, staggered command chips, and non-overlapping composer bar anchored cleanly above the bottom nav dock.
 */
export default function VoicePanel({ d }: { d: UseDialogue }) {
  const { t, lang, edgeMode, entries } = useApp();
  const [text, setText] = useState('');
  const [typingOpen, setTypingOpen] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const cardRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  useEffect(() => {
    if (d.phase === 'CONFIRM') cardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [d.phase]);
  useEffect(() => {
    if (d.saved) savedRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [d.saved]);

  const showTyping = !d.supported || d.needTyping || d.micIssue !== '' || typingOpen;
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

  const status = d.thinking ? t.thinking : d.listening ? t.listening : t.tapToSpeak;
  const commands = COMMAND_EXAMPLES[lang];

  return (
    <section className="flex flex-col gap-3">
      {(d.listening || (d.thinking && (d.engine === 'wispr' || d.engine === 'sarvam'))) && <ListeningOverlay d={d} />}

      <div className="flex flex-col gap-2.5 px-3">
        {!d.supported && (
          <p role="status" className="card-enter w-full rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-center text-sm font-semibold text-[#FCD34D]">
            {t.typeBanner}
          </p>
        )}
        {d.micIssue === 'denied' && (
          <p role="alert" className="card-enter w-full rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-2.5 text-center text-sm font-semibold text-[#FB7185]">
            {t.micDenied}
          </p>
        )}

        {d.heard && d.phase !== 'SAVED' && (
          <p data-testid="heard" className="card-enter row w-full px-4 py-2.5 text-sm text-[#F5F3FA]">
            <span className="grad-text font-bold">{t.youSaid}:</span> “{d.heard}”
          </p>
        )}

        {d.phrase && !d.saved && (
          <p
            aria-live="polite"
            className={`card-enter w-full ${
              d.phase === 'CONFIRM'
                ? 'text-center text-sm font-medium text-[#9E97B5]'
                : 'sheet-panel relative overflow-hidden p-3.5 text-base font-bold leading-snug text-white'
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
          <a href={whatsappUrl(d.whatsappText)} target="_blank" rel="noopener" onClick={d.dismissWhatsApp} className="card-enter btn btn-primary h-13 w-full text-base">
            <span aria-hidden="true">📲 </span>
            {t.openWhatsApp}
          </a>
        )}

        {d.saved && (
          <div
            ref={savedRef}
            data-testid="saved-bar"
            role="status"
            className="card-enter burst flex w-full items-center justify-between gap-3 rounded-full border border-emerald-300/35 bg-emerald-400/12 py-1.5 pl-2.5 pr-1.5 text-[#6EE7B7] shadow-[0_0_40px_-10px_rgba(110,231,183,0.65)] backdrop-blur-xl"
          >
            {SPARKS.map((r) => (
              <span key={r} aria-hidden="true" className="burst-spark" style={{ ['--r' as string]: `${r}deg` }} />
            ))}
            <span className="flex min-w-0 items-center gap-2 text-sm font-extrabold">
              <span aria-hidden="true" className="check-pop h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6EE7B7] text-[#052e16]">
                ✓
              </span>
              <span className="truncate">
                {t.savedShort} · {d.saved.label}
              </span>
            </span>
            <button type="button" onClick={() => void d.undo()} className="btn btn-ghost h-10 shrink-0 px-3.5 text-sm text-white">
              {t.undo}
            </button>
          </div>
        )}

        {d.phase === 'IDLE' && (
          <section className="flex flex-col gap-2.5 pt-1">
            {entries.length === 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="eyebrow">{STARTER_TITLE[lang]}</span>
                  <span className="pill border border-white/10 bg-white/[0.04] text-[11px] text-[#9E97B5]">
                    <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#6EE7B7]' : 'bg-[#FCD34D]'}`} />
                    {online ? 'Cloud AI' : 'Offline ready'}
                  </span>
                </div>
                <ul data-testid="starter-chips" className="stagger grid grid-cols-2 gap-2">
                  {STARTER_LOGS[lang].map((s, i) => (
                    <li key={s} className="min-w-0">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void d.typed(s)}
                        className="chip w-full justify-start border-[#FF2D87]/25 !px-2.5 !py-2.5 !text-[12px] disabled:opacity-50"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF8A3D]/30 to-[#FF2D87]/30 text-[11px]">
                          {i === 0 ? '⚡' : '₹'}
                        </span>
                        <span className="min-w-0 truncate">“{s}”</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="eyebrow">{t.commandsTitle}</h2>
              <div className="flex items-center gap-1.5">
                {entries.length > 0 && (
                  <span className="pill border border-white/10 bg-white/[0.04] text-[11px] text-[#9E97B5]">
                    <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#6EE7B7]' : 'bg-[#FCD34D]'}`} />
                    {online ? 'Sarvam AI' : 'Offline'}
                  </span>
                )}
                {edgeMode && <span className="pill border border-white/15 bg-white/[0.06] text-[#C4B5FD]">✨ 105B</span>}
              </div>
            </div>
            {/* Symmetrical 2-column command grid so every pill aligns evenly inside the viewport */}
            <ul data-testid="command-chips" className="stagger grid grid-cols-2 gap-2">
              {commands.map((c, i) => (
                <li key={c} className="min-w-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void d.typed(c)}
                    className="chip w-full justify-start !px-2.5 !py-2.5 !text-[12px] disabled:opacity-50"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07]">
                      <ChipIcon idx={i} />
                    </span>
                    <span className="min-w-0 truncate">“{c}”</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Bottom composer capsule aligned identically with nav-dock directly below it */}
      <div className="no-print sticky bottom-[5.4rem] z-20 px-3 pb-1 pt-2 bg-gradient-to-t from-[#040407] via-[#040407]/90 to-transparent">
        <div className="dock flex items-center gap-2 p-1.5 pl-2">
          {showTyping ? (
            <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-1.5">
              {d.supported && typingOpen && (
                <button
                  type="button"
                  aria-label="Hide keyboard"
                  onClick={() => setTypingOpen(false)}
                  className="glass-circle h-10 w-10 shrink-0 text-xs text-[#9E97B5]"
                >
                  ✕
                </button>
              )}
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.typeHere}
                aria-label={t.typeHere}
                className="input h-11 min-w-0 flex-1 rounded-full border-transparent bg-white/[0.06] text-sm"
              />
              <button type="submit" className="btn btn-primary h-11 px-4 text-sm">
                {t.send}
              </button>
            </form>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <button
                type="button"
                aria-label="Type a message"
                onClick={() => setTypingOpen(true)}
                className="glass-circle h-10 w-10 shrink-0 text-base font-bold text-[#ABA5BD]"
              >
                +
              </button>
              <div aria-hidden="true" onClick={busy ? undefined : d.start} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <span className="flex h-6 items-center gap-[3px]">
                  {[0.5, 0.9, 0.6, 1, 0.7].map((b, i) => (
                    <span
                      key={i}
                      className="wave-bar w-[2.5px] rounded-full bg-gradient-to-t from-[#FF2D87] to-[#FF9A4D]"
                      style={{ height: `${b * 100}%`, animationDelay: `${-i * 0.15}s` }}
                    />
                  ))}
                </span>
                <span className="truncate text-sm font-semibold text-[#D9D5E6]">{status}</span>
              </div>
            </div>
          )}
          {d.supported && (
            <button type="button" aria-label={t.tapToSpeak} onClick={d.start} disabled={busy} className="mic-btn">
              {!busy && (
                <>
                  <span aria-hidden="true" className="mic-aura" />
                  <span aria-hidden="true" className="mic-aura a2" />
                </>
              )}
              <MicSvg className={d.thinking ? 'h-6 w-6 animate-pulse' : 'h-6 w-6'} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
