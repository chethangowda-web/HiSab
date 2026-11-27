import { SilenceDetector, type SilenceOptions } from './silence';

export interface Recording {
  blob: Blob;
  mime: string;
  durationMs: number;
}

export interface RecorderSession {
  /** Current input level 0..1, for the waveform. */
  level(): number;
  /** Done: stop and keep the recording. */
  stop(): void;
  /** Cancel: stop and throw the recording away. */
  cancel(): void;
  /** True if the user pressed Cancel (as opposed to silence or no speech). */
  cancelledByUser(): boolean;
  /** The recording, or null if cancelled or nobody spoke. */
  result: Promise<Recording | null>;
}

type AudioCtor = typeof AudioContext;
const audioCtor = (): AudioCtor | undefined =>
  typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext);

/** True if this browser can record audio (microphone + MediaRecorder + Web Audio). */
export function canRecord(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    audioCtor() !== undefined
  );
}

const MIME_PREFERENCE = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/**
 * Records from the microphone. With `autoStop`, it stops by itself ~1.5 s after the user finishes
 * speaking (or gives up if nobody speaks), so no button press is needed.
 */
export async function startRecorder(opts: { autoStop?: boolean; silence?: SilenceOptions } = {}): Promise<RecorderSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const Ctx = audioCtor()!;
  const ctx = new Ctx();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const frame = new Float32Array(analyser.fftSize);

  const mime = MIME_PREFERENCE.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const t0 = performance.now();
  let userCancelled = false;
  let discard = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const level = () => {
    analyser.getFloatTimeDomainData(frame);
    let sum = 0;
    for (const v of frame) sum += v * v;
    return Math.min(1, Math.sqrt(sum / frame.length) * 4);
  };
  const cleanup = () => {
    clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => {});
  };
  const result = new Promise<Recording | null>((resolve) => {
    recorder.onstop = () => {
      cleanup();
      if (discard || chunks.length === 0) return resolve(null);
      const type = recorder.mimeType || mime || 'audio/webm';
      resolve({ blob: new Blob(chunks, { type }), mime: type, durationMs: Math.round(performance.now() - t0) });
    };
  });
  const stop = () => {
    if (recorder.state !== 'inactive') recorder.stop();
  };

  if (opts.autoStop) {
    const detector = new SilenceDetector(opts.silence);
    timer = setInterval(() => {
      const r = detector.feed(level() / 4, performance.now() - t0);
      if (r === 'stop') stop();
      else if (r === 'no_speech') {
        discard = true;
        stop();
      }
    }, 100);
  }
  recorder.start(250);

  return {
    level,
    stop,
    cancel: () => {
      userCancelled = true;
      discard = true;
      stop();
    },
    cancelledByUser: () => userCancelled,
    result,
  };
}
