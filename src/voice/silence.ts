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
  /**
   * Adapt to the room: measure the background noise in the first `calibrateMs` and use
   * max(threshold, floorMultiplier x noise) from then on. `threshold` is the quietest speech level accepted.
   */
  adaptive?: boolean;
  calibrateMs?: number;
  floorMultiplier?: number;
}

/** Never let a noisy start push the threshold above this, or quiet speakers would be ignored. */
const MAX_ADAPTIVE_THRESHOLD = 0.06;

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
};

/**
 * Decides when to stop recording, so the worker does not have to press a button:
 * stop ~1.5 s after they finish speaking, never during a short pause, never before they start.
 */
export class SilenceDetector {
  private readonly o: Required<SilenceOptions>;
  private threshold: number;
  private calibrated = false;
  private readonly floorSamples: { level: number; t: number; dt: number }[] = [];
  private speechMs = 0;
  private lastLoudAt = 0;
  private lastT = 0;

  constructor(opts: SilenceOptions = {}) {
    this.o = { threshold: 0.02, silenceMs: 1500, minSpeechMs: 300, noSpeechMs: 8000, maxMs: 15000, adaptive: false, calibrateMs: 400, floorMultiplier: 2.5, ...opts };
    this.threshold = this.o.threshold;
  }

  private account(level: number, t: number, dt: number) {
    if (level >= this.threshold) {
      this.speechMs += dt;
      this.lastLoudAt = t;
    }
  }

  /** Feed the current level at time `t` (ms since start). */
  feed(level: number, t: number): 'continue' | 'stop' | 'no_speech' {
    const dt = t - this.lastT;
    this.lastT = t;
    if (this.o.adaptive && !this.calibrated) {
      this.floorSamples.push({ level, t, dt });
      if (t < this.o.calibrateMs) return 'continue';
      // The median ignores speech that starts inside the window; that speech is then counted
      // against the final threshold, so a quick "haan" at the very start is not lost.
      this.calibrated = true;
      const floor = median(this.floorSamples.map((x) => x.level));
      this.threshold = Math.min(MAX_ADAPTIVE_THRESHOLD, Math.max(this.o.threshold, this.o.floorMultiplier * floor));
      for (const x of this.floorSamples) this.account(x.level, x.t, x.dt);
    } else {
      this.account(level, t, dt);
    }
    const spoke = this.speechMs >= this.o.minSpeechMs;
    if (t >= this.o.maxMs) return spoke ? 'stop' : 'no_speech';
    if (!spoke) return t >= this.o.noSpeechMs ? 'no_speech' : 'continue';
    return t - this.lastLoudAt >= this.o.silenceMs ? 'stop' : 'continue';
  }
}
