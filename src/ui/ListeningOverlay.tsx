import { useApp } from './AppContext';
import type { UseDialogue } from './useDialogue';
import WisprMark from './WisprMark';

const BARS = [0.45, 0.75, 1, 0.65, 0.9, 0.55, 1, 0.7, 0.5];

function Waveform({ level }: { level: number }) {
  const live = level > 0.01;
  return (
    <div aria-hidden="true" className="flex h-16 items-center justify-center gap-1.5">
      {BARS.map((b, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full bg-[#C9F43A] ${live ? '' : 'wave-bar'}`}
          style={live ? { height: `${10 + Math.min(1, level * 2.5) * b * 54}px` } : { height: `${18 + b * 30}px`, animationDelay: `${-i * 0.13}s` }}
        />
      ))}
    </div>
  );
}

/**
 * Shown while the app is listening. Full screen when starting a new entry; a compact bar when
 * answering a question, so the card being answered stays visible.
 */
export default function ListeningOverlay({ d }: { d: UseDialogue }) {
  const { t } = useApp();
  const full = d.phase === 'IDLE' || d.phase === 'SAVED';
  const status = d.thinking ? t.understanding : d.interim ? '' : t.speakNow;
  const engineBadge =
    d.engine === 'wispr' ? (
      <span className="flex items-center gap-2 rounded-full border border-[#3E5E2A] bg-[#172410] px-4 py-1.5 text-sm font-bold text-[#D9F76E]">
        <WisprMark /> {t.voiceByWispr}
      </span>
    ) : d.engine === 'sarvam' ? (
      <span className="flex items-center gap-2 rounded-full border border-[#3E5E2A] bg-[#172410] px-4 py-1.5 text-sm font-bold text-[#D9F76E]">
        ✨ Voice by Sarvam AI
      </span>
    ) : (
      <span className="rounded-full border border-[#3E5E2A] bg-[#172410] px-4 py-1.5 text-sm font-bold text-[#D9F76E]">🎙 {t.browserSpeech}</span>
    );

  if (!full) {
    return (
      <div data-testid="listening" className="card-enter flex w-full items-center gap-3 rounded-full border border-[#44632D] bg-[#16220F] px-4 py-2 text-[#F3F7EC] shadow-lg">
        <div className="scale-75">
          <Waveform level={d.level} />
        </div>
        <p className="min-w-0 flex-1 truncate text-lg font-semibold">{d.interim || status}</p>
        <button type="button" onClick={d.stopListening} className="h-11 rounded-full bg-[#C9F43A] px-5 text-base font-extrabold text-[#0B1307]">
          {t.done}
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.listening}
      data-testid="listening"
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#0E180A] via-[#0B1307] to-[#060A04] text-[#F3F7EC]"
    >
      <div className="flex justify-center pt-10">{engineBadge}</div>
      <div className="relative mx-auto mt-12 flex h-44 w-44 items-center justify-center">
        {!d.thinking && (
          <>
            <span aria-hidden="true" className="aura-ring absolute inset-0 rounded-full border-2 border-[#C9F43A]/40" />
            <span aria-hidden="true" className="absolute inset-3 animate-ping rounded-full bg-[#C9F43A]/25" />
          </>
        )}
        <span
          aria-hidden="true"
          className={`relative flex h-32 w-32 items-center justify-center rounded-full text-5xl shadow-[0_0_50px_rgba(201,244,58,0.38)] ring-4 ring-[#2A421C] ${
            d.thinking ? 'animate-pulse bg-amber-300 text-[#0B1307]' : 'bg-gradient-to-b from-[#DDF874] to-[#A4DE18] text-[#0B1307]'
          }`}
        >
          🎤
        </span>
      </div>
      <div className="mt-8">
        <Waveform level={d.thinking ? 0 : d.level} />
      </div>
      <p aria-live="polite" className="mt-6 min-h-24 px-6 text-center text-2xl font-semibold leading-snug text-[#F3F7EC]">
        {d.interim ? `“${d.interim}”` : status}
      </p>
      <div className="mt-auto grid grid-cols-2 gap-3 p-5">
        <button type="button" onClick={d.cancelListening} className="h-16 rounded-full border border-[#324A22] bg-[#16220F] text-xl font-bold text-[#E5F0D8] transition hover:bg-[#1E2E15]">
          <span aria-hidden="true">✕ </span>
          {t.cancel}
        </button>
        <button type="button" onClick={d.stopListening} disabled={d.thinking} className="h-16 rounded-full bg-[#C9F43A] text-xl font-extrabold text-[#0B1307] shadow-lg transition hover:brightness-105 disabled:opacity-60">
          <span aria-hidden="true">✓ </span>
          {t.done}
        </button>
      </div>
    </div>
  );
}
