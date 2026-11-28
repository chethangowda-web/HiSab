// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { SARVAM_STT_URL, SARVAM_URL } from '../server/sarvam';

const body = { transcript: 'kal ramesh ke yahan 700 kaam kiya', lang: 'hi-IN', knownEmployers: ['Ramesh'], today: '2026-11-27' };

let server: Server | undefined;
afterEach(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

async function start(upstream: typeof fetch, sarvamKey = 'sk-sarvam-secret', sarvamModel?: string) {
  server = createApp({ url: 'http://ollama.test', model: 'm', sarvamKey, sarvamModel }, upstream);
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

const sarvamSays = (content: string, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }), { status }));

const post = (base: string, payload: unknown) =>
  fetch(`${base}/api/parse`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });

describe('Sarvam 105B /api/parse', () => {
  it('calls Sarvam chat completions with sarvam-105b and returns parsed JSON', async () => {
    const up = sarvamSays('{"kind":"record","type":"work","employerName":"Ramesh","amount":700,"hours":null,"date":null,"q":null,"period":null}');
    const base = await start(up as unknown as typeof fetch);
    const res = await post(base, body);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ kind: 'record', employerName: 'Ramesh', amount: 700 });

    const [url, init] = (up.mock.calls as unknown as [string, RequestInit][])[0];
    expect(url).toBe(SARVAM_URL);
    expect((init.headers as Record<string, string>)['api-subscription-key']).toBe('sk-sarvam-secret');
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe('sarvam-105b');
    expect(sent.temperature).toBe(0);
    expect(sent.messages[sent.messages.length - 1]).toEqual({ role: 'user', content: expect.stringContaining('kal ramesh ke yahan 700 kaam kiya') });
  });

  it('parses JSON wrapped in markdown code fences', async () => {
    const up = sarvamSays('```json\n{"kind":"query","type":null,"employerName":"Ramesh","amount":null,"hours":null,"date":null,"q":"owed","period":null}\n```');
    const base = await start(up as unknown as typeof fetch);
    const res = await post(base, body);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ kind: 'query', q: 'owed', employerName: 'Ramesh' });
  });

  it('returns 502 on Sarvam error without leaking the API key', async () => {
    const up = vi.fn(async () => new Response('unauthorized', { status: 401 }));
    const base = await start(up as unknown as typeof fetch, 'sk-sarvam-secret');
    const res = await post(base, body);
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('sk-sarvam-secret');
  });

  it('reports sarvam provider in GET /api/health', async () => {
    const up = sarvamSays('{}');
    const base = await start(up as unknown as typeof fetch, 'sk-sarvam-secret');
    const res = await fetch(`${base}/api/health`);
    expect(await res.json()).toEqual({ ok: true, model: 'sarvam-105b', provider: 'sarvam' });
    expect(up).not.toHaveBeenCalled();
  });
});

describe('Sarvam 105B /api/parse-multi', () => {
  it('splits a multi-amount utterance via Sarvam 105B', async () => {
    const up = sarvamSays(
      JSON.stringify({
        entries: [
          { type: 'work', employerName: 'Ramesh', amount: 700, hours: null, dateHint: 'yesterday' },
          { type: 'advance', employerName: 'Ramesh', amount: 200, hours: null, dateHint: 'yesterday' },
        ],
      }),
    );
    const base = await start(up as unknown as typeof fetch, 'sk-sarvam-secret');
    const res = await fetch(`${base}/api/parse-multi`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transcript: 'kal ramesh ke yahan 700 kaam kiya aur 200 kharchi liya', lang: 'hi-IN', knownEmployers: ['Ramesh'], today: '2026-11-27' }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { entries: unknown[] };
    expect(data.entries).toHaveLength(2);
  });
});

describe('static frontend serving', () => {
  it('serves staticDir index.html and blocks directory traversal', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hisab-dist-'));
    try {
      writeFileSync(join(dir, 'index.html'), '<!doctype html><title>BoliHisab</title>');
      server = createApp({ url: 'http://ollama.test', model: 'm' }, fetch, { staticDir: dir });
      await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

      const rootRes = await fetch(`${base}/`);
      expect(rootRes.status).toBe(200);
      expect(await rootRes.text()).toContain('BoliHisab');

      const travRes = await fetch(`${base}/../package.json`);
      expect(travRes.status).toBe(200);
      expect(await travRes.text()).toContain('BoliHisab');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Sarvam Speech-to-Text fallback', () => {
  it('reports sarvamStt in /api/voice-health when SARVAM_API_KEY is configured without Wispr', async () => {
    const base = await start(sarvamSays('{}') as unknown as typeof fetch, 'sk-sarvam-secret');
    const res = await fetch(`${base}/api/voice-health`);
    expect(await res.json()).toEqual({ wispr: false, sarvamStt: true, sarvamTts: true });
  });

  it('transcribes audio via Sarvam saaras:v4 when Wispr key is absent', async () => {
    const up = vi.fn(async () => new Response(JSON.stringify({ transcript: 'Ramesh ke yahan 700 kaam kiya' }), { status: 200 }));
    const base = await start(up as unknown as typeof fetch, 'sk-sarvam-secret');
    const res = await fetch(`${base}/api/transcribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ audio: 'UklGRg==', lang: 'hi-IN', names: ['Ramesh'] }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'Ramesh ke yahan 700 kaam kiya' });
    const [url, init] = (up.mock.calls as unknown as [string, RequestInit][])[0];
    expect(url).toBe(SARVAM_STT_URL);
    expect((init.headers as Record<string, string>)['api-subscription-key']).toBe('sk-sarvam-secret');
  });
});
