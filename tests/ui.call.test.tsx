import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App';
import { db } from '../src/db/db';
import { seedSampleLedger } from '../src/db/seed';
import { normalizeIndianMobile } from '../src/domain/phone';

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function stubFetch(callEnabled: boolean, onCall?: Handler) {
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/voice-health') return new Response(JSON.stringify(callEnabled ? { wispr: false, call: true } : { wispr: false }), { status: 200 });
    if (url === '/api/call' && onCall) return onCall(url, init);
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', f);
  return f;
}

beforeEach(async () => {
  await db.entries.clear();
  await db.employers.clear();
  await db.settings.clear();
});
afterEach(() => vi.unstubAllGlobals());

const openEmployers = async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /^employers$/i }));
};

describe('normalizeIndianMobile', () => {
  it('accepts common ways of writing an Indian mobile number', () => {
    for (const v of ['9876543210', '98765 43210', '09876543210', '919876543210', '+91 98765-43210', '0091 9876543210']) {
      expect(normalizeIndianMobile(v)).toBe('+919876543210');
    }
  });
  it('rejects anything else', () => {
    for (const v of ['', '12345', '5876543210', '98765432101', '+14155551234', 'abc']) expect(normalizeIndianMobile(v)).toBeNull();
  });
});

describe('Call employer', () => {
  it('is hidden when the server has no calling configured', async () => {
    await seedSampleLedger();
    stubFetch(false);
    await openEmployers();
    await screen.findByTestId('employer-card');
    expect(screen.queryByTestId('call-employer')).toBeNull();
  });

  it('is disabled with a hint until both numbers exist', async () => {
    await seedSampleLedger();
    stubFetch(true);
    await openEmployers();
    const btn = await screen.findByRole('button', { name: /call ramesh/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/add your phone number in settings/i)).toBeInTheDocument();
  });

  it('saves the employer number and starts the bridge call', async () => {
    await seedSampleLedger();
    await db.settings.put({ key: 'workerPhone', value: '98765 43210' });
    const f = stubFetch(true, () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await openEmployers();
    fireEvent.change(await screen.findByRole('textbox', { name: /employer phone number: ramesh/i }), { target: { value: '91234 56780' } });
    const btn = screen.getByRole('button', { name: /call ramesh/i });
    await waitFor(() => expect(btn).toBeEnabled());
    expect((await db.employers.toArray())[0].phone).toBe('+919123456780');

    fireEvent.click(btn);
    expect(await screen.findByText(/calling your phone/i)).toBeInTheDocument();
    const call = f.mock.calls.find(([u]) => u === '/api/call')!;
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      workerPhone: '+919876543210',
      employerPhone: '+919123456780',
      employerName: 'Ramesh',
    });
  });

  it('shows an error when the call cannot be started, and flags a bad number', async () => {
    await seedSampleLedger();
    await db.settings.put({ key: 'workerPhone', value: '9876543210' });
    stubFetch(true, () => new Response('{}', { status: 502 }));
    await openEmployers();
    const box = await screen.findByRole('textbox', { name: /employer phone number: ramesh/i });
    fireEvent.change(box, { target: { value: '123' } });
    expect(await screen.findByText(/10-digit indian mobile/i)).toBeInTheDocument();
    fireEvent.change(box, { target: { value: '9123456780' } });
    const btn = screen.getByRole('button', { name: /call ramesh/i });
    await waitFor(() => expect(btn).toBeEnabled());
    fireEvent.click(btn);
    expect(await screen.findByText(/could not start the call/i)).toBeInTheDocument();
  });
});

describe('Settings phone number', () => {
  it('saves the worker phone number', async () => {
    stubFetch(false);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    fireEvent.change(await screen.findByRole('textbox', { name: /your phone number/i }), { target: { value: '9876543210' } });
    await waitFor(async () => expect((await db.settings.get('workerPhone'))?.value).toBe('9876543210'));
  });
});
