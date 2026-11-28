import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { db, listEntries } from '../src/db/db';
import { seedSampleLedger } from '../src/db/seed';

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
  it('saves 3 days directly using the usual rate and shows "3 × ₹700"', async () => {
    await ramesh();
    render(<App />);
    await type('Ramesh ke yahan 3 din kaam kiya');
    await waitFor(async () => expect(await listEntries()).toHaveLength(3));
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent('3 × ₹700');
  });

  it('Undo removes all the days that were just saved', async () => {
    await ramesh();
    render(<App />);
    await type('Ramesh ke yahan 3 din kaam kiya');
    fireEvent.click(within(await screen.findByTestId('saved-bar')).getByRole('button', { name: /undo/i }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(0));
  });

  it('learns a new employer rate from the first spoken work amount', async () => {
    render(<App />);
    await type('Aaj Mahesh ke yahan 600 rupaye kaam kiya');
    await waitFor(async () => expect((await db.employers.toArray()).find((e) => e.name === 'Mahesh')?.dailyRate).toBe(600));
  });
});

describe('voice commands', () => {
  it('"Ramesh ka hisab dikhao" opens the statement', async () => {
    await seedSampleLedger();
    render(<App />);
    await type('Ramesh ka hisab dikhao');
    expect(await screen.findByTestId('statement')).toHaveTextContent('Ramesh');
  });

  it('"Ramesh ko yaad dilao" prepares the WhatsApp link directly', async () => {
    await seedSampleLedger();
    await db.settings.put({ key: 'workerName', value: 'Manju' });
    render(<App />);
    await type('Ramesh ko yaad dilao');
    const link = await screen.findByRole('link', { name: /open whatsapp/i });
    const href = link.getAttribute('href')!;
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(href.split('text=')[1])).toContain('₹1,100');
    expect(decodeURIComponent(href.split('text=')[1])).toContain('Manju');
  });

  it('"aakhri entry hatao" deletes the newest entry directly', async () => {
    await seedSampleLedger();
    render(<App />);
    expect(await listEntries()).toHaveLength(4);
    await type('aakhri entry hatao');
    await waitFor(async () => expect(await listEntries()).toHaveLength(3));
  });

  it('"Ramesh ka rate 750 hai" changes the rate directly', async () => {
    await ramesh();
    render(<App />);
    await type('Ramesh ka rate 750 hai');
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
