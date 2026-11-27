import { describe, it, expect, vi } from 'vitest';
import { wisprConfigured, transcribeRecording } from '../src/voice/engine';

const rec = { blob: new Blob([new Uint8Array([1])], { type: 'audio/webm' }), mime: 'audio/webm', durationMs: 1000 };
const json = (j: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(j), { status }));
const toWav = async () => 'UklGRg==';

describe('wisprConfigured', () => {
  it('true only when the server says so', async () => {
    expect(await wisprConfigured(json({ wispr: true }) as unknown as typeof fetch)).toBe(true);
    expect(await wisprConfigured(json({ wispr: false }) as unknown as typeof fetch)).toBe(false);
  });
  it('false when there is no server (e.g. a static host)', async () => {
    expect(await wisprConfigured(vi.fn(async () => new Response('<html>', { status: 404 })) as unknown as typeof fetch)).toBe(false);
    expect(await wisprConfigured(vi.fn(async () => { throw new TypeError('x'); }) as unknown as typeof fetch)).toBe(false);
  });
});

describe('transcribeRecording', () => {
  it('posts WAV audio, language and employer names; returns the text', async () => {
    const f = json({ text: ' Ramesh ne 500 diye ' });
    expect(await transcribeRecording(rec, 'hi-IN', ['Ramesh'], f as unknown as typeof fetch, toWav)).toBe('Ramesh ne 500 diye');
    const [url, init] = (f.mock.calls as unknown as [string, RequestInit][])[0];
    expect(url).toBe('/api/transcribe');
    expect(JSON.parse(init.body as string)).toEqual({ audio: 'UklGRg==', lang: 'hi-IN', names: ['Ramesh'] });
  });
  it.each([
    ['server error', json({ error: 'x' }, 502)],
    ['empty text', json({ text: '  ' })],
    ['no server', vi.fn(async () => { throw new TypeError('x'); })],
  ])('null on %s, so the app can fall back', async (_n, f) => {
    expect(await transcribeRecording(rec, 'en-IN', [], f as unknown as typeof fetch, toWav)).toBeNull();
  });
  it('null when the audio cannot be decoded', async () => {
    const f = json({ text: 'x' });
    expect(await transcribeRecording(rec, 'en-IN', [], f as unknown as typeof fetch, async () => { throw new Error('decode'); })).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
