import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { buildExportBackup, buildReceiptPayload, decodeReceipt, encodeReceipt } from '../src/domain/receipt';
import { addEntry, db, listEntries } from '../src/db/db';
import { localISODate } from '../src/domain/dates';
import type { Employer, Entry } from '../src/domain/types';
import App from '../src/App';
import WeekStrip from '../src/ui/WeekStrip';
import VerifyView from '../src/ui/VerifyView';

beforeEach(async () => {
  await db.entries.clear();
  await db.employers.clear();
  await db.settings.clear();
});

describe('Trust Receipt & JSON export', () => {
  const emp: Employer = { id: 'r1', name: 'Ramesh', dailyRate: 700 };
  const entries: Entry[] = [
    { id: 'e1', employerId: 'r1', type: 'work', amount: 700, date: '2026-11-26', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 1, clipId: 'c1' },
    { id: 'e2', employerId: 'r1', type: 'advance', amount: 300, date: '2026-11-27', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 2 },
  ];

  it('encodes, decodes and verifies a wage receipt payload', () => {
    const payload = buildReceiptPayload(entries, emp, 'en-IN', 'Manju', '2026-11-27');
    expect(payload).toMatchObject({ w: 'Manju', e: 'Ramesh', er: 700, ad: 300, out: 400, n: 2, vp: 1 });
    const decoded = decodeReceipt(encodeReceipt(payload));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.verified).toBe(true);
      expect(decoded.payload.out).toBe(400);
    }
  });

  it('detects tampering when a receipt field is altered', () => {
    const payload = buildReceiptPayload(entries, emp, 'en-IN', 'Manju', '2026-11-27');
    const tampered = encodeReceipt({ ...payload, out: 9999 });
    const decoded = decodeReceipt(tampered);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.verified).toBe(false);
  });

  it('exports a clean JSON backup of employers and entries', () => {
    const parsed = JSON.parse(buildExportBackup(entries, [emp], 'Manju')) as { app: string; employers: Employer[]; entries: Entry[] };
    expect(parsed.app).toBe('BoliHisab');
    expect(parsed.employers).toHaveLength(1);
    expect(parsed.entries).toHaveLength(2);
  });
});

describe('WeekStrip & VerifyView', () => {
  it('counts unique days worked in the last 7 days', () => {
    const entries: Entry[] = [
      { id: 'e1', employerId: 'r1', type: 'work', amount: 700, date: '2026-11-26', source: 'employer_confirmed', rawTranscript: '', lang: 'en-IN', createdAt: 1 },
      { id: 'e2', employerId: 'r1', type: 'work', amount: 700, date: '2026-11-27', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 2 },
    ];
    render(<WeekStrip entries={entries} lang="en-IN" today="2026-11-27" />);
    expect(screen.getByTestId('week-strip')).toHaveTextContent('2d worked');
  });

  it('renders a verified two-party receipt with WhatsApp sign-off link', () => {
    const emp: Employer = { id: 'r1', name: 'Ramesh' };
    const entries: Entry[] = [{ id: 'e1', employerId: 'r1', type: 'work', amount: 700, date: '2026-11-27', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 1, clipId: 'c1' }];
    const token = encodeReceipt(buildReceiptPayload(entries, emp, 'en-IN', 'Manju', '2026-11-27'));
    render(<VerifyView token={token} onDismiss={() => {}} />);
    expect(screen.getByTestId('verify-receipt')).toHaveTextContent('Tamper-check verified');
    expect(screen.getByTestId('verify-receipt')).toHaveTextContent('₹700');
    expect(screen.getByTestId('verify-receipt')).toHaveTextContent('1 voice-proof clips');
  });
});

describe('Interactive Home & Statement Trust Receipt', () => {
  it('starter chips on empty Home log an entry immediately on first tap', async () => {
    render(<App />);
    const starters = await screen.findByTestId('starter-chips');
    fireEvent.click(starters.querySelectorAll('button')[0]);
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent('Ramesh ₹700');
    expect(await listEntries()).toHaveLength(1);
  });

  it('tapping an employer pill on Home opens their Statement with the Trust Receipt bar', async () => {
    await db.employers.put({ id: 'r1', name: 'Ramesh', dailyRate: 700 });
    await addEntry({ id: 'e1', employerId: 'r1', type: 'work', amount: 700, date: localISODate(), source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 1 });
    render(<App />);
    const list = await screen.findByTestId('owed-by-employer');
    fireEvent.click(list.querySelector('button')!);
    expect(await screen.findByTestId('statement')).toHaveTextContent('Ramesh');
    expect(await screen.findByTestId('trust-receipt-bar')).toHaveTextContent('Share verify link');
  });

  it('Settings sample loader populates sample data and employer delete removes an accidental employer', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /load sample week/i }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(4));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Ramesh' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm delete Ramesh' }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(0));
  });
});

describe('Filler & pronoun guards for employer names', () => {
  it('strips filler words like "Ramesh I think" and rejects pronouns like "मेरे"', async () => {
    const { step, initialState } = await import('../src/voice/dialogue');
    const ctx = {
      today: '2026-11-27',
      lang: 'en-IN' as const,
      employers: [],
      entries: [],
      newId: () => 'id1',
      now: () => 1000,
    };
    const r1 = step(initialState, { type: 'heard', text: '700 rupees advance', confidence: 0.9 }, ctx);
    expect(r1.state.asking).toBe('employer');
    const bad = step(r1.state, { type: 'heard', text: 'मेरे', confidence: 0.9 }, ctx);
    expect(bad.state.phase).toBe('CLARIFY');
    expect(bad.save).toBeUndefined();
    const cleaned = step(r1.state, { type: 'heard', text: 'Ramesh I think', confidence: 0.9 }, ctx);
    expect(cleaned.state.phase).toBe('SAVED');
    expect(cleaned.newEmployer?.name).toBe('Ramesh');
  });
});
