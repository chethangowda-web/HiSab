// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { answerXml, escapeXml, sign, validateCall, VOBIZ_API, type VobizConfig } from '../server/vobiz';

const vobiz: VobizConfig = {
  authId: 'MA_TEST123',
  authToken: 'super-secret-token',
  from: '+918012345678',
  publicBaseUrl: 'https://bolihisab.example.app/',
};
const WORKER = '+919876543210';
const EMPLOYER = '+919123456780';
const good = { workerPhone: WORKER, employerPhone: EMPLOYER, employerName: 'Ramesh' };

let server: Server | undefined;
afterEach(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

async function start(upstream: typeof fetch, voice: { vobiz?: VobizConfig } = { vobiz }) {
  server = createApp({ url: 'http://ollama.test', model: 'm' }, upstream, voice);
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

const vobizOk = () => vi.fn(async () => new Response(JSON.stringify({ message: 'Call fired', request_uuid: 'u1' }), { status: 200 }));
const postCall = (base: string, payload: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}/api/call`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) });

describe('validateCall', () => {
  it('accepts two different Indian mobiles with a name', () => {
    expect(validateCall(good)).toBeNull();
  });
  it('rejects bad numbers, same numbers and bad names', () => {
    expect(validateCall({ ...good, workerPhone: '9876543210' })).toMatch(/workerPhone/);
    expect(validateCall({ ...good, workerPhone: '+915876543210' })).toMatch(/workerPhone/);
    expect(validateCall({ ...good, employerPhone: '+1415555123' })).toMatch(/employerPhone/);
    expect(validateCall({ ...good, employerPhone: WORKER })).toMatch(/different/);
    expect(validateCall({ ...good, employerName: '' })).toMatch(/employerName/);
    expect(validateCall({ ...good, employerName: 'x'.repeat(61) })).toMatch(/employerName/);
    expect(validateCall(null)).toBe('invalid request');
  });
});

describe('XML', () => {
  it('escapes the employer name', () => {
    expect(escapeXml(`A&B <"x"> 'y'`)).toBe('A&amp;B &lt;&quot;x&quot;&gt; &apos;y&apos;');
    const xml = answerXml(vobiz, EMPLOYER, 'Ra<me>sh & "Sons"');
    expect(xml).toContain('Ra&lt;me&gt;sh &amp; &quot;Sons&quot;');
    expect(xml).not.toContain('<me>');
  });
  it('speaks, dials the employer with our caller id, then hangs up', () => {
    const xml = answerXml(vobiz, EMPLOYER, 'Ramesh');
    expect(xml).toContain('<Speak>Connecting you to Ramesh');
    expect(xml).toContain(`<Dial callerId="${vobiz.from}" timeout="30"`);
    expect(xml).toContain(`<Number>${EMPLOYER}</Number>`);
    expect(xml.endsWith('<Hangup/></Response>')).toBe(true);
  });
});

describe('POST /api/call', () => {
  it('calls the worker through the Vobiz Call endpoint with a signed answer URL', async () => {
    const up = vobizOk();
    const base = await start(up as unknown as typeof fetch);
    const res = await postCall(base, good);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(up).toHaveBeenCalledTimes(1);
    const [url, init] = (up.mock.calls as unknown as [string, RequestInit][])[0];
    expect(url).toBe(`${VOBIZ_API}/Account/MA_TEST123/Call/`);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Auth-ID']).toBe('MA_TEST123');
    expect(headers['X-Auth-Token']).toBe('super-secret-token');
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({ from: vobiz.from, to: WORKER, answer_method: 'GET' });
    const answer = new URL(sent.answer_url);
    expect(answer.origin + answer.pathname).toBe('https://bolihisab.example.app/api/call/answer');
    expect(answer.searchParams.get('to')).toBe(EMPLOYER);
    expect(answer.searchParams.get('name')).toBe('Ramesh');
    expect(answer.searchParams.get('sig')).toBe(sign(vobiz, EMPLOYER, 'Ramesh'));
    expect(sent.answer_url).not.toContain('super-secret-token');
  });

  it('answers 503 when Vobiz is not configured, without calling anyone', async () => {
    const up = vobizOk();
    const base = await start(up as unknown as typeof fetch, {});
    const res = await postCall(base, good);
    expect(res.status).toBe(503);
    expect(up).not.toHaveBeenCalled();
  });

  it('answers 400 for invalid input and never reaches Vobiz', async () => {
    const up = vobizOk();
    const base = await start(up as unknown as typeof fetch);
    expect((await postCall(base, { ...good, workerPhone: '12345' })).status).toBe(400);
    expect((await postCall(base, { ...good, employerPhone: WORKER })).status).toBe(400);
    const bad = await fetch(`${base}/api/call`, { method: 'POST', body: 'not json' });
    expect(bad.status).toBe(400);
    expect((await fetch(`${base}/api/call`)).status).toBe(405);
    expect(up).not.toHaveBeenCalled();
  });

  it('returns 502 on a Vobiz error without leaking tokens or phone numbers', async () => {
    const up = vi.fn(async () => new Response(`bad token super-secret-token for ${WORKER}`, { status: 401 }));
    const base = await start(up as unknown as typeof fetch);
    const res = await postCall(base, good);
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain('super-secret-token');
    expect(text).not.toContain(WORKER);
    expect(text).not.toContain(EMPLOYER);
  });

  it('limits one client to 5 calls an hour (429)', async () => {
    const up = vobizOk();
    const base = await start(up as unknown as typeof fetch);
    for (let i = 0; i < 5; i++) expect((await postCall(base, good, { 'x-forwarded-for': '1.1.1.1' })).status).toBe(200);
    expect((await postCall(base, good, { 'x-forwarded-for': '1.1.1.1' })).status).toBe(429);
    expect(up).toHaveBeenCalledTimes(5);
    // another client is not affected
    expect((await postCall(base, good, { 'x-forwarded-for': '2.2.2.2' })).status).toBe(200);
  });

  it('limits all clients together to 40 calls an hour (429)', async () => {
    const up = vobizOk();
    const base = await start(up as unknown as typeof fetch);
    for (let i = 0; i < 40; i++) expect((await postCall(base, good, { 'x-forwarded-for': `10.0.0.${i}` })).status).toBe(200);
    expect((await postCall(base, good, { 'x-forwarded-for': '10.0.1.1' })).status).toBe(429);
  });
});

describe('/api/call/answer', () => {
  const q = (to: string, name: string, sig: string) => `to=${encodeURIComponent(to)}&name=${encodeURIComponent(name)}&sig=${sig}`;

  it('returns the dial XML for a correctly signed request (GET and POST)', async () => {
    const base = await start(vi.fn() as unknown as typeof fetch);
    const sig = sign(vobiz, EMPLOYER, 'Ramesh');
    for (const method of ['GET', 'POST']) {
      const res = await fetch(`${base}/api/call/answer?${q(EMPLOYER, 'Ramesh', sig)}`, { method });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/xml');
      expect(await res.text()).toContain(`<Number>${EMPLOYER}</Number>`);
    }
  });

  it('refuses forged, missing, or tampered signatures (403)', async () => {
    const base = await start(vi.fn() as unknown as typeof fetch);
    const sig = sign(vobiz, EMPLOYER, 'Ramesh');
    expect((await fetch(`${base}/api/call/answer?${q(EMPLOYER, 'Ramesh', 'a'.repeat(64))}`)).status).toBe(403);
    expect((await fetch(`${base}/api/call/answer?${q(EMPLOYER, 'Ramesh', 'zz')}`)).status).toBe(403);
    expect((await fetch(`${base}/api/call/answer?to=${encodeURIComponent(EMPLOYER)}&name=Ramesh`)).status).toBe(403);
    // a valid signature for one number must not dial another
    expect((await fetch(`${base}/api/call/answer?${q('+919999999999', 'Ramesh', sig)}`)).status).toBe(403);
    expect((await fetch(`${base}/api/call/answer?${q(EMPLOYER, 'Suresh', sig)}`)).status).toBe(403);
  });

  it('answers 503 when Vobiz is not configured', async () => {
    const base = await start(vi.fn() as unknown as typeof fetch, {});
    expect((await fetch(`${base}/api/call/answer?${q(EMPLOYER, 'Ramesh', sign(vobiz, EMPLOYER, 'Ramesh'))}`)).status).toBe(503);
  });
});

describe('/api/voice-health', () => {
  it('reports call: true only when Vobiz is configured', async () => {
    const withVobiz = await start(vi.fn() as unknown as typeof fetch);
    expect(await (await fetch(`${withVobiz}/api/voice-health`)).json()).toMatchObject({ call: true });
    await new Promise<void>((r) => server!.close(() => r()));
    const without = await start(vi.fn() as unknown as typeof fetch, {});
    expect((await (await fetch(`${without}/api/voice-health`)).json()).call).toBeUndefined();
  });
});
