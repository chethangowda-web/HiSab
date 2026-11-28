import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { displayPhone, normalizeIndianMobile } from '../domain/phone';
import type { Employer } from '../domain/types';
import { useApp } from './AppContext';

/** Whether our server can place calls (Vobiz configured). */
async function callEnabled(): Promise<boolean> {
  try {
    const res = await fetch('/api/voice-health');
    const data = res.ok ? ((await res.json()) as { call?: unknown }) : null;
    return data?.call === true;
  } catch {
    return false;
  }
}

/** Employer phone number plus a "Call" button that connects the worker's phone to the employer. */
export default function CallEmployer({ employer }: { employer: Employer }) {
  const { t, workerPhone, reload } = useApp();
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState(displayPhone(employer.phone));
  const [status, setStatus] = useState<'idle' | 'calling' | 'ok' | 'error' | 'limit'>('idle');
  const [bad, setBad] = useState(false);

  useEffect(() => {
    let alive = true;
    void callEnabled().then((ok) => alive && setEnabled(ok));
    return () => {
      alive = false;
    };
  }, []);

  if (!enabled) return null;

  const save = async (value: string) => {
    setPhone(value);
    const e164 = normalizeIndianMobile(value);
    setBad(value.trim() !== '' && !e164);
    if (e164 || value.trim() === '') {
      await db.employers.update(employer.id, { phone: e164 ?? undefined });
      await reload();
    }
  };

  const mine = normalizeIndianMobile(workerPhone);
  const theirs = normalizeIndianMobile(phone);
  const ready = Boolean(mine && theirs);

  const call = async () => {
    if (!mine || !theirs) return;
    setStatus('calling');
    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workerPhone: mine, employerPhone: theirs, employerName: employer.name }),
      });
      setStatus(res.ok ? 'ok' : res.status === 429 ? 'limit' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div data-testid="call-employer" className="mt-3.5 flex flex-col gap-2">
      <input
        value={phone}
        onChange={(e) => void save(e.target.value)}
        inputMode="tel"
        autoComplete="off"
        placeholder={t.employerPhone}
        aria-label={`${t.employerPhone}: ${employer.name}`}
        className="input h-12 text-lg font-semibold"
      />
      {bad && (
        <p role="alert" className="text-sm font-semibold text-[#B42318]">
          {t.callBadNumber}
        </p>
      )}
      <button type="button" onClick={() => void call()} disabled={!ready || status === 'calling'} className="btn btn-ghost h-12 w-full disabled:opacity-50">
        📞 {t.callBtn} {employer.name}
      </button>
      {!ready && <p className="text-sm text-[#6B6259]">{t.callNeedNumbers}</p>}
      {status === 'ok' && (
        <p role="status" className="text-sm font-semibold text-[#166534]">
          {t.callCalling}
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-sm font-semibold text-[#B42318]">
          {t.callFailed}
        </p>
      )}
      {status === 'limit' && (
        <p role="alert" className="text-sm font-semibold text-[#B42318]">
          {t.callTooMany}
        </p>
      )}
    </div>
  );
}
