import { useEffect, useRef, useState } from 'react';
import { getClip } from '../db/db';
import { useApp } from './AppContext';

const mmss = (ms: number) => {
  const s = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Plays the worker's own recording ("voice proof") from a stored clip or a fresh recording. */
export default function ClipButton({ clipId, blob, durationMs }: { clipId?: string; blob?: Blob; durationMs?: number }) {
  const { t } = useApp();
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | undefined>(durationMs);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    if (clipId && durationMs === undefined) void getClip(clipId).then((c) => alive && setDuration(c?.durationMs));
    return () => {
      alive = false;
    };
  }, [clipId, durationMs]);
  useEffect(() => () => audio.current?.pause(), []);

  const toggle = async () => {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    const b = blob ?? (clipId ? (await getClip(clipId))?.blob : undefined);
    if (!b) return;
    const url = URL.createObjectURL(b);
    const a = new Audio(url);
    audio.current = a;
    const finish = () => {
      setPlaying(false);
      URL.revokeObjectURL(url);
    };
    a.onended = finish;
    a.onpause = () => setPlaying(false);
    setPlaying(true);
    try {
      await a.play();
    } catch {
      finish();
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-label={playing ? t.stopProof : t.playProof}
      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-slate-900 px-3 text-sm font-bold text-white active:bg-slate-700"
    >
      <span aria-hidden="true">{playing ? '■' : '▶'}</span>
      {duration !== undefined && <span>{mmss(duration)}</span>}
    </button>
  );
}
