import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { db, listEntries } from '../src/db/db';
import { seedDemoData } from '../src/db/seed';

const nav = navigator as unknown as Record<string, unknown>;

beforeEach(async () => {
  await db.entries.clear();
  await db.employers.clear();
  await db.settings.clear();
});

afterEach(() => {
  delete nav.share;
  vi.restoreAllMocks();
});

describe('trust labels, edit and delete', () => {
  const seed = async () => {
    await seedDemoData({ demo: false });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^ledger$/i }));
    return screen.findAllByTestId('ledger-row');
  };
  /** Row actions live behind an Options button, to keep the list uncluttered. */
  const openRow = (row: HTMLElement) => fireEvent.click(within(row).getByRole('button', { name: /options/i }));

  it('employer confirm flips the badge, and the entry in the database', async () => {
    const rows = await seed();
    openRow(rows[0]);
    fireEvent.click(within(rows[0]).getByRole('button', { name: /employer confirms/i }));
    await waitFor(() => expect(screen.getAllByText('Employer-confirmed')).toHaveLength(1));
    expect((await listEntries()).filter((x) => x.source === 'employer_confirmed')).toHaveLength(1);
  });

  it('edit changes the amount', async () => {
    const rows = await seed();
    const row = rows.find((r) => within(r).queryByText('₹1,000'))!;
    openRow(row);
    fireEvent.click(within(row).getByRole('button', { name: /^edit$/i }));
    fireEvent.change(within(row).getByLabelText(/amount/i), { target: { value: '1200' } });
    fireEvent.click(within(row).getByRole('button', { name: /^save$/i }));
    await waitFor(async () => expect((await listEntries()).some((x) => x.amount === 1200)).toBe(true));
    expect((await listEntries()).some((x) => x.amount === 1000)).toBe(false);
  });

  it('edit rejects an invalid amount and saves nothing', async () => {
    const rows = await seed();
    openRow(rows[0]);
    fireEvent.click(within(rows[0]).getByRole('button', { name: /^edit$/i }));
    fireEvent.change(within(rows[0]).getByLabelText(/amount/i), { target: { value: '0' } });
    fireEvent.click(within(rows[0]).getByRole('button', { name: /^save$/i }));
    expect(await within(rows[0]).findByRole('alert')).toBeInTheDocument();
    expect((await listEntries()).map((x) => x.amount).sort((a, b) => a - b)).toEqual([700, 700, 700, 1000]);
  });

  it('editing a confirmed entry makes it worker-recorded again', async () => {
    const rows = await seed();
    openRow(rows[0]);
    fireEvent.click(within(rows[0]).getByRole('button', { name: /employer confirms/i }));
    await waitFor(() => expect(screen.getAllByText('Employer-confirmed')).toHaveLength(1));
    const row = screen.getAllByTestId('ledger-row').find((r) => within(r).queryByText('Employer-confirmed'))!;
    openRow(row);
    fireEvent.click(within(row).getByRole('button', { name: /^edit$/i }));
    fireEvent.change(within(row).getByLabelText(/amount/i), { target: { value: '650' } });
    fireEvent.click(within(row).getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(screen.queryByText('Employer-confirmed')).toBeNull());
  });

  it('delete asks first; "no" keeps the entry, "yes" removes it', async () => {
    const rows = await seed();
    openRow(rows[0]);
    fireEvent.click(within(rows[0]).getByRole('button', { name: /^delete$/i }));
    expect(within(rows[0]).getByText(/delete this entry/i)).toBeInTheDocument();
    expect(await listEntries()).toHaveLength(4);
    fireEvent.click(within(rows[0]).getByRole('button', { name: /^no$/i }));
    expect(await listEntries()).toHaveLength(4);
    fireEvent.click(within(rows[0]).getByRole('button', { name: /^delete$/i }));
    fireEvent.click(within(rows[0]).getByRole('button', { name: /^yes$/i }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(3));
  });
});

describe('demo mode', () => {
  const turnOn = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    fireEvent.click(await screen.findByRole('switch', { name: /demo mode/i }));
  };

  it('is off by default: no banner', async () => {
    render(<App />);
    await screen.findByRole('button', { name: /^settings$/i });
    expect(screen.queryByText('DEMO MODE')).toBeNull();
  });

  it('turning it on shows a clear label and sample data, and keeps real data hidden but safe', async () => {
    await db.employers.put({ id: 'real', name: 'Real Employer' });
    render(<App />);
    await turnOn();
    expect(await screen.findByText('DEMO MODE')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^employers$/i }));
    expect(await screen.findByText('Ramesh')).toBeInTheDocument();
    expect(screen.queryByText('Real Employer')).toBeNull();
    expect(await db.employers.get('real')).toBeDefined();
  });

  it('turning it off removes the demo data and brings real data back', async () => {
    await db.employers.put({ id: 'real', name: 'Real Employer' });
    render(<App />);
    await turnOn();
    await screen.findByText('DEMO MODE');
    fireEvent.click(await screen.findByRole('switch', { name: /demo mode/i }));
    await waitFor(() => expect(screen.queryByText('DEMO MODE')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /^employers$/i }));
    expect(await screen.findByText('Real Employer')).toBeInTheDocument();
    expect((await db.employers.toArray()).some((x) => x.demo)).toBe(false);
  });

  it('remembers demo mode after a reload', async () => {
    await db.settings.put({ key: 'demoMode', value: true });
    await seedDemoData();
    render(<App />);
    expect(await screen.findByText('DEMO MODE')).toBeInTheDocument();
  });

  it('Play sample runs a script through the real dialogue and saves a demo entry', async () => {
    render(<App />);
    await turnOn();
    fireEvent.click(await screen.findByRole('button', { name: /^home$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /play sample/i }));
    await waitFor(
      async () => expect((await listEntries()).filter((x) => x.demo && x.rawTranscript.includes('700'))).toHaveLength(1),
      { timeout: 5000 },
    );
    expect(await screen.findByText(/Ramesh owes you/i, undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  it('entries saved in demo mode are flagged demo, so they never mix with real data', async () => {
    render(<App />);
    await turnOn();
    fireEvent.click(await screen.findByRole('button', { name: /^home$/i }));
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Ramesh ne 500 rupaye diye' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/Shall I save it/i);
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
    await waitFor(async () => expect((await listEntries()).some((x) => x.rawTranscript.includes('500 rupaye'))).toBe(true));
    expect((await listEntries()).filter((x) => x.rawTranscript.includes('500 rupaye')).every((x) => x.demo)).toBe(true);
  });
});

describe('statement', () => {
  it('shows the employer statement with totals, and can print or share', async () => {
    await seedDemoData({ demo: false });
    await db.settings.put({ key: 'workerName', value: 'Chethan' });
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const share = vi.fn().mockResolvedValue(undefined);
    nav.share = share;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^employers$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /statement/i }));
    const sheet = await screen.findByTestId('statement');
    expect(sheet).toHaveTextContent('Ramesh');
    expect(sheet).toHaveTextContent('Chethan');
    expect(within(sheet).getAllByRole('row')).toHaveLength(5); // header + 4 entries
    expect(sheet).toHaveTextContent('₹1,100');
    expect(sheet).toHaveTextContent(/worker-recorded unless marked employer-confirmed/i);
    fireEvent.click(screen.getByRole('button', { name: /save as pdf/i }));
    expect(print).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /share summary/i }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0].text).toContain('₹1,100');
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(await screen.findByTestId('employer-card')).toBeInTheDocument();
  });

  it('remembers the worker name from Settings', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    fireEvent.change(await screen.findByLabelText(/your name/i), { target: { value: 'Chethan' } });
    await waitFor(async () => expect((await db.settings.get('workerName'))?.value).toBe('Chethan'));
  });
});
