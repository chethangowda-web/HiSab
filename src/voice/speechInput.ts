import type { Lang } from '../domain/types';

export type ListenError = 'denied' | 'unsupported' | 'no_speech';

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isSpeechSupported(): boolean {
  return getCtor() !== undefined;
}

/**
 * Some browsers report confidence 0 when they simply don't know. Treat that as "unknown"
 * (just above the retry threshold) so every utterance isn't rejected. The read-back and
 * confirmation step still protects against a wrong transcript.
 */
const UNKNOWN_CONFIDENCE = 0.7;

/** Listens for one utterance. Rejects with 'denied', 'unsupported' or 'no_speech'. */
export function listen(lang: Lang): Promise<{ text: string; confidence: number }> {
  const Ctor = getCtor();
  if (!Ctor) return Promise.reject<never>('unsupported' satisfies ListenError);

  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    let settled = false;
    const done = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (e) => {
      const alt = e.results[0]?.[0];
      if (!alt || !alt.transcript.trim()) return done(() => reject('no_speech' satisfies ListenError));
      const confidence = alt.confidence > 0 ? alt.confidence : UNKNOWN_CONFIDENCE;
      done(() => resolve({ text: alt.transcript.trim(), confidence }));
    };
    rec.onerror = (e) => {
      const denied = e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture';
      done(() => reject((denied ? 'denied' : 'no_speech') satisfies ListenError));
    };
    rec.onend = () => done(() => reject('no_speech' satisfies ListenError));
    try {
      rec.start();
    } catch {
      done(() => reject('no_speech' satisfies ListenError));
    }
  });
}
