// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { WISPR_URL } from '../server/wispr';

const llm = { url: 'http://ollama.test', model: 'm' };
const body = { audio: 'UklGRg==', lang: 'hi-IN', names: ['Ramesh', 'Suresh'] };

let server: Server | undefined;
afterEach(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

async function start(upstream: typeof fetch, wisprKey?: string) {
  server = createApp(llm, upstream, { wisprKey });
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}
const post = (base: string, payload: unknown) =>
  fetch(`${base}/api/transcribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
const wisprSays = (json: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(json), { status }));

describe('POST /api/transcribe', () => {
  it('calls Wispr Flow with the key, language and employer names, and returns the text', async () => {
    const up = wisprSays({ text: 'Ramesh ke yahan 3 din kaam kiya' });
    const base = await start(up as unknown as typeof fetch, 'fl-secret');
    const res = await post(base, body);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'Ramesh ke yahan 3 din kaam kiya' });

    const [url, init] = (up.mock.calls as unknown as [string, RequestInit][])[0];
    expect(url).toBe(WISPR_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer fl-secret');
    const sent = JSON.parse(init.body as string);
    expect(sent.audio).toBe('UklGRg==');
    expect(sent.language).toEqual(['hi', 'en']);
    expect(sent.context.dictionary_context).toEqual(expect.arrayContaining(['Ramesh', 'Suresh', 'dihadi', 'kharchi', 'hajri']));
  });

  it.each([
    [{ body: { text: 'nested' } }, 'nested'],
    [{ transcript: 'other name' }, 'other name'],
  ])('reads the text from alternative response shapes (%j)', async (json, text) => {
    const base = await start(wisprSays(json) as unknown as typeof fetch, 'k');
    expect(await (await post(base, body)).json()).toEqual({ text });
  });

  it('maps app languages to bilingual Wispr codes for code-switching', async () => {
    const up = wisprSays({ text: 'x' });
    const base = await start(up as unknown as typeof fetch, 'k');
    await post(base, { ...body, lang: 'kn-IN' });
    await post(base, { ...body, lang: 'en-IN' });
    const langs = (up.mock.calls as unknown as [string, RequestInit][]).map(([, i]) => JSON.parse(i.body as string).language);
    expect(langs).toEqual([['kn', 'en'], ['en']]);
  });

  it('503 when no key is configured, without calling Wispr', async () => {
    const up = wisprSays({ text: 'x' });
    const base = await start(up as unknown as typeof fetch, undefined);
    expect((await post(base, body)).status).toBe(503);
    expect(up).not.toHaveBeenCalled();
  });

  it.each([
    ['Wispr error status', wisprSays({ error: 'bad' }, 401)],
    ['unexpected body', wisprSays({ nothing: true })],
    ['network failure', vi.fn(async () => { throw new TypeError('down'); })],
  ])('502 on %s, and never leaks the key', async (_n, up) => {
    const base = await start(up as unknown as typeof fetch, 'fl-secret');
    const res = await post(base, body);
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('fl-secret');
  });

  it.each([
    ['missing audio', { ...body, audio: undefined }],
    ['non-base64 audio', { ...body, audio: 'not base64!' }],
    ['bad names', { ...body, names: 'Ramesh' }],
    ['unknown language', { ...body, lang: 'fr-FR' }],
  ])('400 for %s', async (_n, payload) => {
    const up = wisprSays({ text: 'x' });
    const base = await start(up as unknown as typeof fetch, 'k');
    expect((await post(base, payload)).status).toBe(400);
    expect(up).not.toHaveBeenCalled();
  });

  it('accepts a 15-second recording (larger than the parse limit)', async () => {
    const base = await start(wisprSays({ text: 'ok' }) as unknown as typeof fetch, 'k');
    const big = Buffer.alloc(16000 * 2 * 15).toString('base64');
    expect((await post(base, { ...body, audio: big })).status).toBe(200);
  });
});

describe('GET /api/voice-health', () => {
  it('says whether Wispr Flow is configured, without revealing the key', async () => {
    const base = await start(wisprSays({}) as unknown as typeof fetch, 'fl-secret');
    const res = await fetch(`${base}/api/voice-health`);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ wispr: true });
    expect(text).not.toContain('fl-secret');
  });
  it('false without a key', async () => {
    const base = await start(wisprSays({}) as unknown as typeof fetch);
    expect(await (await fetch(`${base}/api/voice-health`)).json()).toEqual({ wispr: false });
  });
});
