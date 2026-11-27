// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { buildMessages, RESPONSE_SCHEMA } from '../server/prompt';

const cfg = { url: 'http://ollama.test', model: 'test-model' };
const body = { transcript: 'ramesh anna kitchen 700 worked', lang: 'en-IN', knownEmployers: ['Ramesh'], today: '2026-11-27' };

let server: Server | undefined;
afterEach(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

async function start(upstream: typeof fetch) {
  server = createApp(cfg, upstream);
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}
const ollamaSays = (content: string) =>
  vi.fn(async () => new Response(JSON.stringify({ message: { role: 'assistant', content } }), { status: 200 }));
const post = (base: string, payload: unknown) =>
  fetch(`${base}/api/parse`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });

describe('POST /api/parse', () => {
  it('asks the local model with temperature 0 and a JSON schema, and returns its JSON', async () => {
    const up = ollamaSays('{"kind":"record","type":"work","employerName":"Ramesh","amount":700,"hours":null,"date":null,"q":null,"period":null}');
    const base = await start(up as unknown as typeof fetch);
    const res = await post(base, body);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ kind: 'record', employerName: 'Ramesh', amount: 700 });

    const [url, init] = (up.mock.calls as unknown as [string, RequestInit][])[0];
    expect(url).toBe('http://ollama.test/api/chat');
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe('test-model');
    expect(sent.stream).toBe(false);
    expect(sent.options.temperature).toBe(0);
    expect(sent.format).toEqual(RESPONSE_SCHEMA);
    expect(sent.messages[sent.messages.length - 1]).toEqual({ role: 'user', content: expect.stringContaining('ramesh anna kitchen 700 worked') });
  });

  it('returns 502 when the local model is unreachable', async () => {
    const up = vi.fn(async () => {
      throw new TypeError('connect ECONNREFUSED');
    });
    const base = await start(up as unknown as typeof fetch);
    expect((await post(base, body)).status).toBe(502);
  });

  it('returns 502 when the model answers with something that is not JSON', async () => {
    const base = await start(ollamaSays('I think the amount is seven hundred') as unknown as typeof fetch);
    expect((await post(base, body)).status).toBe(502);
  });

  it('returns 502 when the model server errors', async () => {
    const up = vi.fn(async () => new Response('boom', { status: 500 }));
    const base = await start(up as unknown as typeof fetch);
    expect((await post(base, body)).status).toBe(502);
  });

  it.each([
    ['missing transcript', { ...body, transcript: undefined }],
    ['non-string transcript', { ...body, transcript: 5 }],
    ['empty transcript', { ...body, transcript: '   ' }],
    ['huge transcript', { ...body, transcript: 'a'.repeat(5000) }],
    ['bad employers', { ...body, knownEmployers: 'Ramesh' }],
    ['bad date', { ...body, today: 'yesterday' }],
  ])('returns 400 for %s, without calling the model', async (_n, payload) => {
    const up = ollamaSays('{}');
    const base = await start(up as unknown as typeof fetch);
    expect((await post(base, payload)).status).toBe(400);
    expect(up).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const base = await start(ollamaSays('{}') as unknown as typeof fetch);
    const res = await fetch(`${base}/api/parse`, { method: 'POST', body: '{nope' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for other routes and 405 for the wrong method', async () => {
    const base = await start(ollamaSays('{}') as unknown as typeof fetch);
    expect((await fetch(`${base}/nope`)).status).toBe(404);
    expect((await fetch(`${base}/api/parse`)).status).toBe(405);
  });
});

describe('GET /api/health', () => {
  it('reports ok when the model server answers', async () => {
    const up = vi.fn(async () => new Response(JSON.stringify({ models: [] }), { status: 200 }));
    const base = await start(up as unknown as typeof fetch);
    expect(await (await fetch(`${base}/api/health`)).json()).toEqual({ ok: true, model: 'test-model' });
    expect((up.mock.calls as unknown as [string][])[0][0]).toBe('http://ollama.test/api/tags');
  });
  it('reports not ok when it does not', async () => {
    const up = vi.fn(async () => {
      throw new TypeError('down');
    });
    const base = await start(up as unknown as typeof fetch);
    expect(await (await fetch(`${base}/api/health`)).json()).toEqual({ ok: false, model: 'test-model' });
  });
});

describe('prompt', () => {
  const msgs = buildMessages(body);
  it('forbids guessing and says what to do with missing values', () => {
    const system = msgs[0].content;
    expect(msgs[0].role).toBe('system');
    expect(system).toMatch(/never guess/i);
    expect(system).toMatch(/null/);
  });
  it('lists the known employers as a hint', () => {
    expect(msgs[0].content).toContain('Ramesh');
  });
  it('does not ask the model for a date', () => {
    expect(Object.keys(RESPONSE_SCHEMA.properties)).toContain('date');
    expect(msgs[0].content).toMatch(/do not (include|guess) (a )?date/i);
  });
  it('the schema requires every field so missing values come back as null', () => {
    expect(RESPONSE_SCHEMA.required).toEqual(expect.arrayContaining(['kind', 'type', 'employerName', 'amount', 'hours', 'q']));
  });
});
