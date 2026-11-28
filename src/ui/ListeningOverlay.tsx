import { useEffect, useRef, useState } from 'react';
import { useApp } from './AppContext';
import type { UseDialogue } from './useDialogue';
import WisprMark from './WisprMark';

const W = 440;
const H = 220;

// 18 translucent harmonic strands forming a 3D flowing silk mesh ribbon
const STRANDS = Array.from({ length: 18 }, (_, i) => {
  const norm = i / 17;
  return {
    amp: 0.55 + Math.sin(norm * Math.PI) * 0.6,
    freq: 1.45 + (i % 5) * 0.32,
    speed: (i % 2 === 0 ? 1 : -0.85) * (0.75 + (i % 4) * 0.22),
    width: i === 0 || i === 17 ? 1.8 : i % 4 === 0 ? 1.35 : 0.8,
    opacity: 0.22 + Math.sin(norm * Math.PI) * 0.62,
    phase: i * 0.34,
  };
});

function strandPath(i: number, t: number, level: number): string {
  const s = STRANDS[i];
  const amp = (18 + level * 82) * s.amp;
  let d = '';
  for (let x = 0; x <= W; x += 7) {
    const u = x / W;
    const env = Math.sin(Math.PI * u) ** 1.35;
    const y =
      H / 2 +
      env * amp * Math.sin(u * Math.PI * 2 * s.freq + t * s.speed + s.phase) +
      env * amp * 0.34 * Math.cos(u * Math.PI * 4.5 - t * 1.4 + s.phase * 0.7);
    d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)} `;
  }
  return d;
}

/** A flowing 3D harmonic silk-mesh ribbon whose crest dances with your voice. */
function Ribbon({ level }: { level: number }) {
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const levelRef = useRef(level);
  const smooth = useRef(0);
  levelRef.current = level;

  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') return;
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const target = Math.min(1, levelRef.current * 2.5);
      smooth.current += (target - smooth.current) * 0.16;
      const t = reduce ? 0 : (now - t0) / 1000;
      paths.current.forEach((p, i) => p?.setAttribute('d', strandPath(i, t, smooth.current)));
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="ribbon h-52 w-full">
      <defs>
        <linearGradient id="ribbon-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
          <stop offset="22%" stopColor="#A78BFA" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#EC4899" />
          <stop offset="78%" stopColor="#8B5CF6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.15" />
        </linearGradient>
        <filter id="ribbon-glow" x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#ribbon-glow)">
        {STRANDS.map((s, i) => (
          <path
            key={i}
            ref={(el) => {
              paths.current[i] = el;
            }}
            d={strandPath(i, i * 0.25, 0)}
            fill="none"
            stroke="url(#ribbon-grad)"
            strokeWidth={s.width}
            strokeOpacity={s.opacity}
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}

function useElapsed(): string {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setSecs(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, []);
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}

function MiniWave({ level }: { level: number }) {
  const live = level > 0.01;
  return (
    <span aria-hidden="true" className="flex h-8 items-center gap-[3px]">
      {[0.5, 0.85, 1, 0.7, 0.9, 0.55].map((b, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-gradient-to-t from-[#FF2D87] to-[#FF9A4D] ${live ? '' : 'wave-bar'}`}
          style={live ? { height: `${6 + Math.min(1, level * 2.5) * b * 26}px` } : { height: `${8 + b * 18}px`, animationDelay: `${-i * 0.13}s` }}
        />
      ))}
    </span>
  );
}

/**
 * Shown while listening: full-screen radiant obsidian aurora mode when starting fresh;
 * compact frosted bar when clarifying a missing field so context remains visible.
 */
export default function ListeningOverlay({ d }: { d: UseDialogue }) {
  const { t } = useApp();
  const elapsed = useElapsed();
  const full = d.phase === 'IDLE' || d.phase === 'SAVED';
  const status = d.thinking ? t.understanding : d.interim ? '' : t.speakNow;
  const lvl = d.thinking ? 0 : Math.min(1, d.level * 2.4);
  const badge =
    d.engine === 'wispr' ? (
      <>
        <WisprMark /> {t.voiceByWispr}
      </>
    ) : d.engine === 'sarvam' ? (
      <>✨ Voice by Sarvam AI</>
    ) : (
      <>🎙 {t.browserSpeech}</>
    );

  if (!full) {
    return (
      <div data-testid="listening" className="card-enter dock flex w-full items-center gap-3 py-2 pl-4 pr-2 text-white">
        <MiniWave level={d.level} />
        <p className="min-w-0 flex-1 truncate text-base font-semibold">{d.interim || status}</p>
        <button type="button" onClick={d.stopListening} className="btn btn-primary h-12 px-5">
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
      className="page-enter fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#040407] text-white"
    >
      {/* Radiant upward violet & magenta-coral aurora matching live voice energy */}
      <span aria-hidden="true" className="listen-glow-violet" />
      <span
        aria-hidden="true"
        className="listen-glow"
        style={{ transform: `translateX(-50%) scale(${0.92 + lvl * 0.36})`, opacity: d.thinking ? 0.45 : 0.72 + lvl * 0.28 }}
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Top bar: frosted circular back/cancel on left, AI engine capsule center, balanced indicator right */}
        <div className="flex items-center justify-between px-5 pt-7">
          <button
            type="button"
            aria-label={t.back}
            onClick={d.cancelListening}
            className="glass-circle h-12 w-12 text-lg text-white/90"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>

          <span className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide text-[#E6E0F8]">
            {badge}
          </span>

          <span aria-hidden="true" className="glass-circle h-12 w-12">
            <span className={`h-2.5 w-2.5 rounded-full ${d.thinking ? 'animate-ping bg-[#A78BFA]' : 'animate-pulse bg-[#FF2D87] shadow-[0_0_12px_2px_rgba(255,45,135,0.85)]'}`} />
          </span>
        </div>

        {/* 3D Layered Silk Wave Ribbon */}
        <div className={`mt-6 transition-opacity duration-500 ${d.thinking ? 'opacity-65' : ''}`}>
          <Ribbon level={d.thinking ? 0.06 : d.level} />
        </div>

        {/* Tabular Live Timer */}
        <p className="mt-1 text-center text-4xl font-light tabular-nums tracking-[0.14em] text-white/90">{elapsed}</p>

        {/* Live Transcript / Prompt */}
        <p aria-live="polite" className="mt-5 min-h-24 px-7 text-center text-2xl font-semibold leading-snug text-white">
          {d.interim ? (
            <span className="card-enter inline-block">“{d.interim}”</span>
          ) : (
            <span className={d.thinking ? 'grad-text animate-pulse' : 'text-[#D6D0EB]'}>{status}</span>
          )}
        </p>

        {/* Bottom Control Trio: Circular glass controls + radiant cosmic center sphere */}
        <div className="mt-auto flex items-end justify-between px-8 pb-10">
          <button
            type="button"
            onClick={d.cancelListening}
            className="flex flex-col items-center gap-2 text-xs font-bold tracking-wide text-white/75 transition hover:text-white"
          >
            <span aria-hidden="true" className="glass-circle h-14 w-14 text-lg">
              ✕
            </span>
            <span>{t.cancel}</span>
          </button>

          <button
            type="button"
            onClick={d.stopListening}
            disabled={d.thinking}
            className="flex flex-col items-center gap-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            <span aria-hidden="true" className="relative flex h-24 w-24 items-center justify-center">
              {!d.thinking && (
                <>
                  <span className="mic-aura" />
                  <span className="mic-aura a2" />
                </>
              )}
              <span
                className="mic-btn h-20 w-20 text-3xl"
                style={{
                  transform: `scale(${1 + lvl * 0.14})`,
                  boxShadow: `inset 0 2px 3px rgba(255,255,255,0.45), 0 0 ${34 + lvl * 56}px ${6 + lvl * 12}px rgba(255,45,135,${0.42 + lvl * 0.42})`,
                }}
              >
                {d.thinking ? '✦' : '✓'}
              </span>
            </span>
            <span>{d.thinking ? t.thinking : t.done}</span>
          </button>

          <span aria-hidden="true" className="w-14" />
        </div>
      </div>
    </div>
  );
}
