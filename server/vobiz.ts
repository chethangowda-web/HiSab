import { createHmac, timingSafeEqual } from 'node:crypto';

export const VOBIZ_API = 'https://api.vobiz.ai/api/v1';
/** Indian mobile number in E.164: +91 then 10 digits starting 6-9. */
export const IN_MOBILE = /^\+91[6-9]\d{9}$/;

export interface VobizConfig {
  authId: string;
  authToken: string;
  /** The Vobiz number calls come from (E.164). */
  from: string;
  /** Public https origin of this server, so Vobiz can fetch the answer XML. */
  publicBaseUrl: string;
}

export interface CallRequest {
  workerPhone: string;
  employerPhone: string;
  employerName: string;
}

/** Returns a problem description, or null if the request is valid. */
export function validateCall(body: unknown): string | null {
  const b = body as Partial<CallRequest> | null;
  if (!b || typeof b !== 'object') return 'invalid request';
  if (typeof b.workerPhone !== 'string' || !IN_MOBILE.test(b.workerPhone)) return 'workerPhone must be an Indian mobile number (+91…)';
  if (typeof b.employerPhone !== 'string' || !IN_MOBILE.test(b.employerPhone)) return 'employerPhone must be an Indian mobile number (+91…)';
  if (b.workerPhone === b.employerPhone) return 'the two numbers must be different';
  if (typeof b.employerName !== 'string' || b.employerName.trim().length < 1 || b.employerName.length > 60) return 'employerName must be 1-60 characters';
  return null;
}

/** HMAC over `to|name`, so only our own /api/call can produce an answer URL that dials. */
export function sign(cfg: VobizConfig, to: string, name: string): string {
  return createHmac('sha256', cfg.authToken).update(`${to}|${name}`).digest('hex');
}

export function verifySignature(cfg: VobizConfig, to: string, name: string, sig: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(sig)) return false;
  return timingSafeEqual(Buffer.from(sign(cfg, to, name), 'hex'), Buffer.from(sig, 'hex'));
}

export const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** XML told to Vobiz when the worker picks up: say who we connect, then dial the employer. */
export function answerXml(cfg: VobizConfig, to: string, name: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<Response><Speak>Connecting you to ${escapeXml(name)}. Please hold.</Speak>` +
    `<Dial callerId="${escapeXml(cfg.from)}" timeout="30" timeLimit="1800"><Number>${escapeXml(to)}</Number></Dial>` +
    '<Hangup/></Response>'
  );
}

export function buildAnswerUrl(cfg: VobizConfig, to: string, name: string): string {
  const base = cfg.publicBaseUrl.replace(/\/+$/, '');
  const q = new URLSearchParams({ to, name, sig: sign(cfg, to, name) });
  return `${base}/api/call/answer?${q.toString()}`;
}

/** Rings the worker's phone; when they answer, Vobiz fetches our XML which dials the employer. */
export async function placeCall(
  cfg: VobizConfig,
  req: CallRequest,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 15000,
): Promise<void> {
  const name = req.employerName.trim();
  const res = await fetchImpl(`${VOBIZ_API}/Account/${encodeURIComponent(cfg.authId)}/Call/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Auth-ID': cfg.authId, 'X-Auth-Token': cfg.authToken },
    body: JSON.stringify({
      from: cfg.from,
      to: req.workerPhone,
      answer_url: buildAnswerUrl(cfg, req.employerPhone, name),
      answer_method: 'GET',
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    // Log a short reason for the operator (digits and tokens masked); the thrown error stays generic.
    const detail = (await res.text().catch(() => '')).replace(/\+?\d[\d\s-]{5,}\d/g, '***').replace(/\s+/g, ' ').slice(0, 200);
    console.error(`vobiz call failed: status ${res.status} ${detail}`);
    throw new Error(`vobiz status ${res.status}`);
  }
}

/** Simple in-memory sliding-window limiter. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private limit: number,
    private windowMs: number,
  ) {}
  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
