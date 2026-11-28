import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { db, listEntries, addEntry } from '../src/db/db';
import { seedSampleLedger } from '../src/db/seed';
import { localISODate } from '../src/domain/dates';
import type { Entry } from '../src/domain/types';
import { EXAMPLES } from '../src/i18n/examples';

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

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISODate(d);
};
const entry = (p: Partial<Entry>): Entry => ({
  id: `u${Math.random()}`,
  employerId: 'r1',
  type: 'work',
  amount: 700,
  date: daysAgo(0),
  source: 'worker',
  rawTranscript: '',
  lang: 'en-IN',
  createdAt: Date.now(),
  ...p,
});

describe('direct voice-to-save', () => {
  it('saves immediately and shows what was saved in the Saved bar', async () => {
    render(<App />);
    await type('Ramesh ne 500 rupaye diye');
    const bar = await screen.findByTestId('saved-bar');
    expect(bar).toHaveTextContent('Ramesh');
    expect(bar).toHaveTextContent('₹500');
    await waitFor(async () => expect(await listEntries()).toHaveLength(1));
  });

  it('saves hours on an overtime entry', async () => {
    render(<App />);
    await type('I worked two extra hours at Ramesh');
    await screen.findByText(/How many rupees/i);
    await type('150');
    await waitFor(async () => expect(await listEntries()).toHaveLength(1));
    expect((await listEntries())[0]).toMatchObject({ type: 'overtime', hours: 2, amount: 150 });
  });

  it('shows what the app heard for a query, so the worker can spot a mistake', async () => {
    render(<App />);
    await type('How much does Ramesh owe me?');
    const heard = await screen.findByTestId('heard');
    expect(heard).toHaveTextContent('How much does Ramesh owe me?');
    expect(heard).toHaveTextContent(/you said/i);
  });
});

describe('undo after saving', () => {
  it('shows a Saved bar with Undo, and Undo removes the entry', async () => {
    render(<App />);
    await type('Ramesh ne 500 rupaye diye');
    const bar = await screen.findByTestId('saved-bar');
    expect(bar).toHaveTextContent(/saved/i);
    expect(bar).toHaveTextContent('Ramesh');
    expect(bar).toHaveTextContent('₹500');
    expect(await listEntries()).toHaveLength(1);
    fireEvent.click(within(bar).getByRole('button', { name: /undo/i }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(0));
    await waitFor(() => expect(screen.queryByTestId('saved-bar')).toBeNull());
  });

  it('the Saved bar updates when the next entry is saved', async () => {
    render(<App />);
    await type('Ramesh ne 500 rupaye diye');
    await screen.findByTestId('saved-bar');
    await type('Ramesh ne 300 rupaye diye');
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent('₹300');
  });
});

describe('language', () => {
  it('can be switched from the header on any screen, and is remembered', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Language: हिन्दी' }));
    expect(await screen.findByRole('button', { name: 'होम' })).toBeInTheDocument();
    await waitFor(async () => expect((await db.settings.get('language'))?.value).toBe('hi-IN'));
    expect(screen.getByRole('button', { name: 'Language: हिन्दी' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('first launch follows the phone language when it is Kannada or Hindi', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('kn-IN');
    render(<App />);
    expect(await screen.findByRole('button', { name: 'ಮುಖಪುಟ' })).toBeInTheDocument();
  });

  it('first launch falls back to English for any other phone language', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Home' })).toBeInTheDocument();
  });

  it('a saved choice beats the phone language', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('kn-IN');
    await db.settings.put({ key: 'language', value: 'en-IN' });
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Home' })).toBeInTheDocument();
  });
});

describe('home screen', () => {
  it('shows a welcome with no demo button when there is no data', async () => {
    render(<App />);
    expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /demo/i })).toBeNull();
  });

  it('no longer shows the example sentence list', async () => {
    render(<App />);
    await screen.findByText(/welcome/i);
    expect(screen.queryByText(EXAMPLES['en-IN'][0])).toBeNull();
  });

  it('breaks the balance down by employer', async () => {
    await seedSampleLedger();
    render(<App />);
    const list = await screen.findByTestId('owed-by-employer');
    expect(within(list).getByText('Ramesh')).toBeInTheDocument();
    expect(list).toHaveTextContent('₹1,100');
  });

  it('shows a loading state before the data is ready', async () => {
    render(<App />);
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false'));
  });
});

describe('ledger', () => {
  const seed = async () => {
    await db.employers.put({ id: 'r1', name: 'Ramesh' });
    await addEntry(entry({ date: daysAgo(0), amount: 700 }));
    await addEntry(entry({ date: daysAgo(1), amount: 800 }));
    await addEntry(entry({ date: daysAgo(1), type: 'advance', amount: 300 }));
    await addEntry(entry({ date: '2026-01-05', amount: 650 }));
  };
  const openLedger = async () => fireEvent.click(await screen.findByRole('button', { name: /^ledger$/i }));

  it('groups entries under Today, Yesterday and older dates', async () => {
    await seed();
    render(<App />);
    await openLedger();
    const headings = (await screen.findAllByRole('heading', { level: 3 })).map((h) => h.textContent);
    expect(headings[0]).toMatch(/today/i);
    expect(headings[1]).toMatch(/yesterday/i);
    expect(headings[2]).toMatch(/5 January 2026/);
    expect(headings).toHaveLength(3);
  });

  it('keeps Edit, Delete and Confirm out of sight until Options is pressed', async () => {
    await seed();
    render(<App />);
    await openLedger();
    const [row] = await screen.findAllByTestId('ledger-row');
    expect(within(row).queryByRole('button', { name: /^edit$/i })).toBeNull();
    const options = within(row).getByRole('button', { name: /options/i });
    expect(options).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(options);
    expect(options).toHaveAttribute('aria-expanded', 'true');
    expect(within(row).getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    fireEvent.click(options);
    expect(within(row).queryByRole('button', { name: /^edit$/i })).toBeNull();
  });

  it('always shows who recorded each entry, without opening it', async () => {
    await seed();
    render(<App />);
    await openLedger();
    const rows = await screen.findAllByTestId('ledger-row');
    rows.forEach((r) => expect(within(r).getByText('Worker-recorded')).toBeInTheDocument());
  });

  it('shows the type with a label (not colour or icon alone)', async () => {
    await seed();
    render(<App />);
    await openLedger();
    const rows = await screen.findAllByTestId('ledger-row');
    expect(rows.some((r) => /advance/i.test(r.textContent ?? ''))).toBe(true);
    expect(rows.some((r) => /work/i.test(r.textContent ?? ''))).toBe(true);
  });

  it('has a friendly empty state', async () => {
    render(<App />);
    await openLedger();
    expect(await screen.findByText(/no entries yet/i)).toBeInTheDocument();
  });
});

describe('navigation', () => {
  it('marks the current tab, and icons are hidden from screen readers', async () => {
    render(<App />);
    const home = await screen.findByRole('button', { name: 'Home' });
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(home.querySelector('[aria-hidden="true"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Payments' }));
    expect(screen.getByRole('button', { name: 'Payments' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('every interactive control meets the 48px minimum touch size classes', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'Home' });
    const nav = screen.getByRole('navigation');
    within(nav).getAllByRole('button').forEach((b) => expect(b.className).toMatch(/min-h-1[4-9]|h-1[4-9]/));
  });
});

describe('the clarify flow stays within reach', () => {
  it('shrinks the balance card to a compact bar while clarifying a missing field', async () => {
    await seedSampleLedger();
    render(<App />);
    expect(await screen.findByTestId('owed-by-employer')).toBeInTheDocument();
    await type('I worked at Suresh today');
    await screen.findByText(/How many rupees/i);
    expect(screen.queryByTestId('owed-by-employer')).toBeNull();
    expect(screen.getByTestId('owed-total')).toBeInTheDocument(); // the amount stays visible
    await type('700');
    expect(await screen.findByTestId('owed-by-employer')).toBeInTheDocument();
  });

  it('after saving, shows only the Saved bar, not "yes" and "Saved." as well', async () => {
    render(<App />);
    await type('Ramesh ne 500 rupaye diye');
    await screen.findByTestId('saved-bar');
    expect(screen.queryByTestId('heard')).toBeNull();
    expect(screen.queryByText(/^Saved\.$/)).toBeNull();
  });

  it('still shows what was heard for a question, next to its answer', async () => {
    await seedSampleLedger();
    render(<App />);
    await type('How much does Ramesh still owe me?');
    expect(await screen.findByTestId('heard')).toHaveTextContent('How much does Ramesh still owe me?');
    expect(await screen.findByText(/Ramesh owes you/)).toBeInTheDocument();
  });
});

describe('header', () => {
  it('has the app name and language switch but no clipped tagline', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'BoliHisab', level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/speak your work\. we keep the hisab/i)).toBeNull();
  });
});

describe('ledger row', () => {
  it('keeps the long employer name readable: the badge sits under the name, not beside the amount', async () => {
    await db.employers.put({ id: 'r1', name: 'Ramachandra Gowda' });
    await addEntry(entry({ amount: 700 }));
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^ledger$/i }));
    const [row] = await screen.findAllByTestId('ledger-row');
    const main = within(row).getByTestId('row-main');
    expect(within(main).getByText('Ramachandra Gowda')).toBeInTheDocument();
    expect(within(main).getByText('Worker-recorded')).toBeInTheDocument();
    expect(within(main).queryByText('₹700')).toBeNull(); // the amount lives in its own column
    expect(within(row).getByText('Ramachandra Gowda').className).not.toMatch(/truncate/); // long names wrap, not "Ra..."
  });
});
