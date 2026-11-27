export interface SilenceOptions {
  /** Input level (0..1 RMS) above which we count it as speech. */
  threshold?: number;
  /** Stop this long after speech ends. */
  silenceMs?: number;
  /** Speech must last at least this long in total (ignores clicks and bumps). */
  minSpeechMs?: number;
  /** Give up if nobody speaks for this long. */
  noSpeechMs?: number;
  /** Hard limit on one recording. */
  maxMs?: number;
}

/**
 * Decides when to stop recording, so the worker does not have to press a button:
 * stop ~1.5 s after they finish speaking, never during a short pause, never before they start.
 */
export class SilenceDetector {
  private readonly o: Required<SilenceOptions>;
  private speechMs = 0;
  private lastLoudAt = 0;
  private lastT = 0;

  constructor(opts: SilenceOptions = {}) {
    this.o = { threshold: 0.02, silenceMs: 1500, minSpeechMs: 300, noSpeechMs: 8000, maxMs: 15000, ...opts };
  }

  /** Feed the current level at time `t` (ms since start). */
  feed(level: number, t: number): 'continue' | 'stop' | 'no_speech' {
    const dt = t - this.lastT;
    this.lastT = t;
    if (level >= this.o.threshold) {
      this.speechMs += dt;
      this.lastLoudAt = t;
    }
    const spoke = this.speechMs >= this.o.minSpeechMs;
    if (t >= this.o.maxMs) return spoke ? 'stop' : 'no_speech';
    if (!spoke) return t >= this.o.noSpeechMs ? 'no_speech' : 'continue';
    return t - this.lastLoudAt >= this.o.silenceMs ? 'stop' : 'continue';
  }
}
