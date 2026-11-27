import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { db, listEntries } from '../src/db/db';
import { seedDemoData } from '../src/db/seed';

beforeEach(async () => {
  await db.entries.clear();
  await db.employers.clear();
  await db.settings.clear();
});
afterEach(() => vi.restoreAllMocks());

const type = async (text: string) => {
  fireEvent.change(await screen.findByRole('textbox'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /send/i }));
};
const ramesh = () => db.employers.put({ id: 'r1', name: 'Ramesh', dailyRate: 700 });

describe('multi-day entry with the usual rate', () => {
  it('shows the dates, "3 × ₹700", the total and the usual-rate note, then saves 3 days', async () => {
    await ramesh();
    render(<App />);
    await type('Ramesh ke yahan 3 din kaam kiya');
    const card = await screen.findByTestId('confirm-card');
    expect(within(card).getAllByTestId('day-chip')).toHaveLength(3);
    expect(card).toHaveTextContent('3 × ₹700');
    expect(card).toHaveTextContent('₹2,100');
    expect(card).toHaveTextContent(/usual rate/i);
    fireEvent.click(within(card).getByRole('button', { name: /^yes$/i }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(3));
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent('3 × ₹700');
  });

  it('Undo removes all the days that were just saved', async () => {
    await ramesh();
    render(<App />);
    await type('Ramesh ke yahan 3 din kaam kiya');
    fireEvent.click(within(await screen.findByTestId('confirm-card')).getByRole('button', { name: /^yes$/i }));
    fireEvent.click(within(await screen.findByTestId('saved-bar')).getByRole('button', { name: /undo/i }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(0));
  });

  it('learns a new employer rate from the first spoken work amount', async () => {
    render(<App />);
    await type('Aaj Mahesh ke yahan 600 rupaye kaam kiya');
    fireEvent.click(within(await screen.findByTestId('confirm-card')).getByRole('button', { name: /^yes$/i }));
    await waitFor(async () => expect((await db.employers.toArray()).find((e) => e.name === 'Mahesh')?.dailyRate).toBe(600));
  });
});

describe('voice commands', () => {
  it('"Ramesh ka hisab dikhao" opens the statement', async () => {
    await seedDemoData({ demo: false });
    render(<App />);
    await type('Ramesh ka hisab dikhao');
    expect(await screen.findByTestId('statement')).toHaveTextContent('Ramesh');
  });

  it('"Ramesh ko yaad dilao" previews the WhatsApp message; Send opens WhatsApp with it', async () => {
    await seedDemoData({ demo: false });
    await db.settings.put({ key: 'workerName', value: 'Manju' });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<App />);
    await type('Ramesh ko yaad dilao');
    const card = await screen.findByTestId('reminder-card');
    expect(card).toHaveTextContent('₹1,100');
    expect(card).toHaveTextContent('Manju');
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(within(card).getByRole('button', { name: /send on whatsapp/i }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(String(open.mock.calls[0][0]).split('text=')[1])).toContain('₹1,100');
    await waitFor(() => expect(screen.queryByTestId('reminder-card')).toBeNull());
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('a reminder can be cancelled without opening anything', async () => {
    await seedDemoData({ demo: false });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<App />);
    await type('Ramesh ko yaad dilao');
    fireEvent.click(within(await screen.findByTestId('reminder-card')).getByRole('button', { name: /^no$/i }));
    await waitFor(() => expect(screen.queryByTestId('reminder-card')).toBeNull());
    expect(open).not.toHaveBeenCalled();
  });

  it('"aakhri entry hatao" asks first, then deletes the newest entry', async () => {
    await seedDemoData({ demo: false });
    render(<App />);
    await type('aakhri entry hatao');
    const card = await screen.findByTestId('action-card');
    expect(card).toHaveTextContent(/delete/i);
    expect(await listEntries()).toHaveLength(4);
    fireEvent.click(within(card).getByRole('button', { name: /^yes$/i }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(3));
  });

  it('"Ramesh ka rate 750 hai" changes the rate after yes', async () => {
    await ramesh();
    render(<App />);
    await type('Ramesh ka rate 750 hai');
    const card = await screen.findByTestId('action-card');
    expect(card).toHaveTextContent('₹750');
    fireEvent.click(within(card).getByRole('button', { name: /^yes$/i }));
    await waitFor(async () => expect((await db.employers.get('r1'))?.dailyRate).toBe(750));
  });

  it('the home screen shows the voice commands you can say', async () => {
    render(<App />);
    const chips = await screen.findByTestId('command-chips');
    expect(chips).toHaveTextContent(/hisab dikhao|statement/i);
    expect(chips).toHaveTextContent(/yaad dilao|remind/i);
  });
});

describe('Settings: daily rates', () => {
  it('lists each employer rate and lets you change it', async () => {
    await ramesh();
    await db.employers.put({ id: 's1', name: 'Suresh' });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    const input = await screen.findByLabelText('Ramesh daily rate');
    expect(input).toHaveValue('700');
    expect(screen.getByLabelText('Suresh daily rate')).toHaveValue('');
    fireEvent.change(input, { target: { value: '800' } });
    fireEvent.blur(input);
    await waitFor(async () => expect((await db.employers.get('r1'))?.dailyRate).toBe(800));
  });

  it('ignores an invalid rate', async () => {
    await ramesh();
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    const input = await screen.findByLabelText('Ramesh daily rate');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    await new Promise((r) => setTimeout(r, 50));
    expect((await db.employers.get('r1'))?.dailyRate).toBe(700);
  });
});
