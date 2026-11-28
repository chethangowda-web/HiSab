import { localISODate } from './dates';
import { buildStatementRows } from './statement';
import type { Employer, Entry, Lang } from './types';

export interface ReceiptPayload {
  v: 1;
  w: string;
  e: string;
  d: string;
  er: number;
  ad: number;
  py: number;
  out: number;
  n: number;
  vp: number;
  chk: string;
}

/** Deterministic lightweight integrity tag so shared wage links detect tampering. */
function checksum(p: Omit<ReceiptPayload, 'chk'>): string {
  const raw = `${p.v}|${p.w}|${p.e}|${p.d}|${p.er}|${p.ad}|${p.py}|${p.out}|${p.n}|${p.vp}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

export function buildReceiptPayload(
  entries: Entry[],
  employer: Employer,
  lang: Lang,
  workerName: string,
  today = localISODate(),
): ReceiptPayload {
  const { rows, totals } = buildStatementRows(entries, employer, lang);
  const mine = entries.filter((x) => x.employerId === employer.id);
  const vp = mine.filter((x) => Boolean(x.clipId)).length;
  const base: Omit<ReceiptPayload, 'chk'> = {
    v: 1,
    w: workerName.trim() || 'Worker',
    e: employer.name,
    d: today,
    er: totals.earned,
    ad: totals.advances,
    py: totals.payments,
    out: totals.outstanding,
    n: rows.length,
    vp,
  };
  return { ...base, chk: checksum(base) };
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((token.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeReceipt(payload: ReceiptPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeReceipt(token: string): { ok: true; payload: ReceiptPayload; verified: boolean } | { ok: false } {
  try {
    const parsed = JSON.parse(fromBase64Url(token)) as Partial<ReceiptPayload>;
    if (
      parsed.v !== 1 ||
      typeof parsed.w !== 'string' ||
      typeof parsed.e !== 'string' ||
      typeof parsed.d !== 'string' ||
      typeof parsed.er !== 'number' ||
      typeof parsed.ad !== 'number' ||
      typeof parsed.py !== 'number' ||
      typeof parsed.out !== 'number' ||
      typeof parsed.n !== 'number' ||
      typeof parsed.vp !== 'number' ||
      typeof parsed.chk !== 'string'
    ) {
      return { ok: false };
    }
    const expected = checksum({
      v: 1,
      w: parsed.w,
      e: parsed.e,
      d: parsed.d,
      er: parsed.er,
      ad: parsed.ad,
      py: parsed.py,
      out: parsed.out,
      n: parsed.n,
      vp: parsed.vp,
    });
    return { ok: true, payload: parsed as ReceiptPayload, verified: parsed.chk === expected };
  } catch {
    return { ok: false };
  }
}

export function buildExportBackup(entries: Entry[], employers: Employer[], workerName: string): string {
  return JSON.stringify(
    {
      app: 'BoliHisab',
      exportedAt: new Date().toISOString(),
      workerName: workerName.trim() || undefined,
      employers,
      entries,
    },
    null,
    2,
  );
}
