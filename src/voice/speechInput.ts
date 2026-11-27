import type { Lang } from '../domain/types';

export type ListenError = 'denied' | 'unsupported' | 'no_speech';

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal?: boolean }>;
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
  abort?(): void;
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

/** The recognition in progress, so Done / Cancel buttons can end it. */
let current: Recognition | null = null;

/** Done: stop listening now and use what was heard so far. */
export function stopListening(): void {
  current?.stop();
}

/** Cancel: stop listening and throw away what was heard. */
export function abortListening(): void {
  if (current?.abort) current.abort();
  else current?.stop();
}

/**
 * Listens for one utterance. Rejects with 'denied', 'unsupported' or 'no_speech'.
 * With `onInterim`, words are reported live while the user is still speaking.
 */
export function listen(lang: Lang, opts: { onInterim?: (text: string) => void } = {}): Promise<{ text: string; confidence: number }> {
  const Ctor = getCtor();
  if (!Ctor) return Promise.reject<never>('unsupported' satisfies ListenError);

  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    current = rec;
    let settled = false;
    const done = (fn: () => void) => {
      if (!settled) {
        settled = true;
        if (current === rec) current = null;
        fn();
      }
    };
    rec.lang = lang;
    rec.interimResults = Boolean(opts.onInterim);
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (e) => {
      const results = Array.from(e.results);
      const last = results[results.length - 1];
      const text = results.map((r) => r[0]?.transcript ?? '').join(' ').replace(/\s+/g, ' ').trim();
      if (last && last.isFinal === false) {
        opts.onInterim?.(text);
        return;
      }
      const alt = last?.[0];
      if (!alt || !text) return done(() => reject('no_speech' satisfies ListenError));
      const confidence = alt.confidence > 0 ? alt.confidence : UNKNOWN_CONFIDENCE;
      done(() => resolve({ text, confidence }));
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
