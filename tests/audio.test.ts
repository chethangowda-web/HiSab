import { describe, it, expect } from 'vitest';
import { resampleLinear, encodeWav16, toWav16kMono, arrayBufferToBase64 } from '../src/voice/wav';
import { SilenceDetector } from '../src/voice/silence';

describe('WAV encoding for Wispr Flow (16 kHz, mono, 16-bit)', () => {
  it('writes a valid 44-byte RIFF/WAVE header', () => {
    const buf = encodeWav16(new Float32Array([0, 0.5, -0.5, 1]), 16000);
    const v = new DataView(buf);
    const str = (o: number, n: number) => String.fromCharCode(...new Uint8Array(buf, o, n));
    expect(str(0, 4)).toBe('RIFF');
    expect(v.getUint32(4, true)).toBe(36 + 4 * 2);
    expect(str(8, 4)).toBe('WAVE');
    expect(str(12, 4)).toBe('fmt ');
    expect(v.getUint16(20, true)).toBe(1); // PCM
    expect(v.getUint16(22, true)).toBe(1); // mono
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint32(28, true)).toBe(32000); // byte rate
    expect(v.getUint16(34, true)).toBe(16); // bits
    expect(str(36, 4)).toBe('data');
    expect(v.getUint32(40, true)).toBe(8);
    expect(buf.byteLength).toBe(44 + 8);
  });

  it('converts samples to int16 and clips out-of-range values', () => {
    const v = new DataView(encodeWav16(new Float32Array([0, 1, -1, 2, -2]), 16000));
    expect([0, 1, 2, 3, 4].map((i) => v.getInt16(44 + i * 2, true))).toEqual([0, 32767, -32768, 32767, -32768]);
  });

  it('resamples 48 kHz to 16 kHz (a third of the samples)', () => {
    const out = resampleLinear(new Float32Array(48000).fill(0.25), 48000, 16000);
    expect(out.length).toBe(16000);
    expect(out[100]).toBeCloseTo(0.25);
  });

  it('keeps the same rate unchanged', () => {
    const src = new Float32Array([0.1, 0.2, 0.3]);
    expect(Array.from(resampleLinear(src, 16000, 16000))).toEqual(Array.from(src));
  });

  it('toWav16kMono produces a 16 kHz file of the right length', () => {
    const buf = toWav16kMono(new Float32Array(44100), 44100);
    expect(new DataView(buf).getUint32(24, true)).toBe(16000);
    expect((buf.byteLength - 44) / 2).toBe(16000);
  });

  it('base64-encodes bytes', () => {
    expect(arrayBufferToBase64(new Uint8Array([104, 105]).buffer)).toBe('aGk=');
    expect(arrayBufferToBase64(new Uint8Array(100000).buffer).length).toBeGreaterThan(100000); // large buffers do not overflow the stack
  });
});

describe('SilenceDetector: stop after the user finishes speaking', () => {
  const feed = (d: SilenceDetector, levels: number[], stepMs = 100) => {
    let t = 0;
    for (const l of levels) {
      t += stepMs;
      const r = d.feed(l, t);
      if (r !== 'continue') return { result: r, at: t };
    }
    return { result: 'continue' as const, at: t };
  };

  it('keeps listening through short pauses', () => {
    const d = new SilenceDetector();
    expect(feed(d, [0.3, 0.3, 0.3, 0.3, 0, 0, 0, 0.3, 0.3]).result).toBe('continue');
  });

  it('stops 1.5 s after speech ends', () => {
    const d = new SilenceDetector();
    const r = feed(d, [...Array(5).fill(0.3), ...Array(20).fill(0.001)]);
    expect(r.result).toBe('stop');
    expect(r.at).toBe(500 + 1500);
  });

  it('does not stop on silence before anyone speaks (until the no-speech timeout)', () => {
    const d = new SilenceDetector({ noSpeechMs: 6000 });
    expect(feed(d, Array(30).fill(0)).result).toBe('continue');
    expect(feed(new SilenceDetector({ noSpeechMs: 6000 }), Array(70).fill(0))).toEqual({ result: 'no_speech', at: 6000 });
  });

  it('ignores a click or bump shorter than the minimum speech time', () => {
    const d = new SilenceDetector({ noSpeechMs: 4000 });
    expect(feed(d, [0.5, ...Array(39).fill(0)]).result).toBe('no_speech');
  });

  it('stops at the maximum length even if the user keeps talking', () => {
    const d = new SilenceDetector({ maxMs: 15000 });
    expect(feed(d, Array(200).fill(0.3))).toEqual({ result: 'stop', at: 15000 });
  });
});
