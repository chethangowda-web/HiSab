import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { db, listEntries } from '../src/db/db';
import { seedSampleLedger } from '../src/db/seed';

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
    await seedSampleLedger();
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

describe('demo mode removed', () => {
  it('has no demo switch in Settings', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    await screen.findByRole('switch', { name: /smart helper/i });
    expect(screen.queryByRole('switch', { name: /demo mode/i })).toBeNull();
  });
});

describe('statement', () => {
  it('shows the employer statement with totals, and can print or share', async () => {
    await seedSampleLedger();
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
