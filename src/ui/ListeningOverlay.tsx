import { useApp } from './AppContext';
import type { UseDialogue } from './useDialogue';

const BARS = [0.45, 0.75, 1, 0.65, 0.9, 0.55, 1, 0.7, 0.5];

function Waveform({ level, dark }: { level: number; dark: boolean }) {
  const live = level > 0.01;
  return (
    <div aria-hidden="true" className="flex h-16 items-center justify-center gap-1.5">
      {BARS.map((b, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full ${dark ? 'bg-white' : 'bg-white/90'} ${live ? '' : 'wave-bar'}`}
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
      <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">▮▮▮ {t.voiceByWispr}</span>
    ) : (
      <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">🎙 {t.browserSpeech}</span>
    );

  if (!full) {
    return (
      <div data-testid="listening" className="flex w-full items-center gap-3 rounded-2xl bg-red-600 px-4 py-2 text-white shadow-lg">
        <div className="scale-75">
          <Waveform level={d.level} dark />
        </div>
        <p className="min-w-0 flex-1 truncate text-lg font-semibold">{d.interim || status}</p>
        <button type="button" onClick={d.stopListening} className="h-12 rounded-xl bg-white px-4 text-lg font-bold text-red-700">
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
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-900 to-teal-950 text-white"
    >
      <div className="flex justify-center pt-10">{engineBadge}</div>
      <div className="relative mx-auto mt-12 flex h-40 w-40 items-center justify-center">
        {!d.thinking && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />}
        <span aria-hidden="true" className={`relative flex h-32 w-32 items-center justify-center rounded-full text-5xl shadow-2xl ${d.thinking ? 'animate-pulse bg-amber-600' : 'bg-red-600'}`}>
          🎤
        </span>
      </div>
      <div className="mt-8">
        <Waveform level={d.thinking ? 0 : d.level} dark />
      </div>
      <p aria-live="polite" className="mt-6 min-h-24 px-6 text-center text-2xl leading-snug">
        {d.interim ? `“${d.interim}”` : status}
      </p>
      <div className="mt-auto grid grid-cols-2 gap-3 p-5">
        <button type="button" onClick={d.cancelListening} className="h-16 rounded-2xl bg-white/10 text-xl font-bold">
          <span aria-hidden="true">✕ </span>
          {t.cancel}
        </button>
        <button type="button" onClick={d.stopListening} disabled={d.thinking} className="h-16 rounded-2xl bg-white text-xl font-bold text-slate-900 disabled:opacity-60">
          <span aria-hidden="true">✓ </span>
          {t.done}
        </button>
      </div>
    </div>
  );
}
