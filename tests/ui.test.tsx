import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { db, listEntries } from '../src/db/db';
import { seedSampleLedger } from '../src/db/seed';

const w = window as unknown as Record<string, unknown>;

/** A fake browser recognizer that answers each listen() with the next queued utterance. */
class MockRecognition {
  static queue: string[] = [];
  static starts = 0;
  static denied = false;
  lang = '';
  interimResults = false;
  maxAlternatives = 1;
  continuous = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start() {
    MockRecognition.starts++;
    setTimeout(() => {
      if (MockRecognition.denied) return this.onerror?.({ error: 'not-allowed' });
      const text = MockRecognition.queue.shift();
      if (text === undefined) return; // nobody speaks: stay pending
      this.onresult?.({ results: [[{ transcript: text, confidence: 0.92 }]] });
    }, 0);
  }
  stop() {}
}

const enableVoice = () => {
  w.webkitSpeechRecognition = MockRecognition;
};

beforeEach(async () => {
  await db.entries.clear();
  await db.employers.clear();
  await db.settings.clear();
  MockRecognition.queue = [];
  MockRecognition.starts = 0;
  MockRecognition.denied = false;
});

afterEach(() => {
  delete w.webkitSpeechRecognition;
  delete w.SpeechRecognition;
});

describe('Home', () => {
  it('shows the speak button and the outstanding balance from stored data', async () => {
    enableVoice();
    await seedSampleLedger(); // 3 x 700 work - 1000 advance = 1100
    render(<App />);
    const mic = await screen.findByRole('button', { name: /tap to speak/i });
    expect(mic).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('owed-total')).toHaveTextContent('₹1,100'));
  });

  it('shows a text box instead of the mic when speech is not supported', async () => {
    render(<App />);
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tap to speak/i })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/type/i);
  });

  it('typed entry: saves directly and updates the balance', async () => {
    render(<App />);
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Aaj Ramesh ke site pe 700 rupaye kaam kiya' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(1));
    await waitFor(() => expect(screen.getByTestId('owed-total')).toHaveTextContent('₹700'));
  });

  it('typed entry: Undo removes the saved entry', async () => {
    render(<App />);
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Ramesh ne 500 rupaye diye' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    const bar = await screen.findByTestId('saved-bar');
    fireEvent.click(within(bar).getByRole('button', { name: /undo/i }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(0));
  });

  it('voice entry: speak once and entry is saved directly without asking yes/no', async () => {
    enableVoice();
    MockRecognition.queue = ['I worked at Ramesh for 700 rupees today'];
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /tap to speak/i }));
    await waitFor(async () => expect(await listEntries()).toHaveLength(1), { timeout: 3000 });
    const [saved] = await listEntries();
    expect(saved).toMatchObject({ type: 'work', amount: 700, source: 'worker' });
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent(/saved/i);
  });

  it('asks a spoken follow-up when the employer is missing', async () => {
    enableVoice();
    MockRecognition.queue = ['The contractor gave me 1000 rupees advance'];
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /tap to speak/i }));
    expect(await screen.findByText(/Which employer/i)).toBeInTheDocument();
    expect(await listEntries()).toHaveLength(0);
  });

  it('falls back to typing when the microphone is denied', async () => {
    enableVoice();
    MockRecognition.denied = true;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /tap to speak/i }));
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/microphone/i);
  });

  it('answers a balance question by text and voice phrase', async () => {
    await seedSampleLedger();
    render(<App />);
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'How much does Ramesh still owe me?' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(await screen.findByText(/Ramesh owes you 1100 rupees/i)).toBeInTheDocument();
  });
});

describe('navigation and lists', () => {
  const goto = async (name: RegExp) => fireEvent.click(await screen.findByRole('button', { name }));

  it('Ledger lists entries newest first with a worker-recorded badge', async () => {
    await seedSampleLedger();
    render(<App />);
    await goto(/^ledger$/i);
    const rows = await screen.findAllByTestId('ledger-row');
    expect(rows).toHaveLength(4);
    const dates = rows.map((r) => r.getAttribute('data-date') as string);
    expect([...dates].sort().reverse()).toEqual(dates);
    rows.forEach((r) => expect(within(r).getByText('Worker-recorded')).toBeInTheDocument());
  });

  it('Ledger shows an empty message when there are no entries', async () => {
    render(<App />);
    await goto(/^ledger$/i);
    expect(await screen.findByText(/no entries yet/i)).toBeInTheDocument();
  });

  it('Employers shows each employer with days, earned and outstanding', async () => {
    await seedSampleLedger();
    render(<App />);
    await goto(/^employers$/i);
    const card = await screen.findByTestId('employer-card');
    expect(card).toHaveTextContent('Ramesh');
    expect(card).toHaveTextContent('3'); // days worked
    expect(card).toHaveTextContent('₹2,100'); // earned
    expect(card).toHaveTextContent('₹1,100'); // outstanding
  });

  it('Payments lists advances and payments with totals', async () => {
    await seedSampleLedger();
    render(<App />);
    await goto(/^payments$/i);
    const rows = await screen.findAllByTestId('payment-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('₹1,000');
    expect(screen.getByTestId('payments-total')).toHaveTextContent('₹1,000');
  });
});

describe('Settings', () => {
  it('switches the interface language and remembers it', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'हिन्दी' }));
    expect(await screen.findByRole('button', { name: 'होम' })).toBeInTheDocument();
    await waitFor(async () => expect((await db.settings.get('language'))?.value).toBe('hi-IN'));
  });

  it('restores a saved language on load', async () => {
    await db.settings.put({ key: 'language', value: 'kn-IN' });
    render(<App />);
    expect(await screen.findByRole('button', { name: 'ಮುಖಪುಟ' })).toBeInTheDocument();
  });

  it('offers Kannada, Hindi and English', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    for (const label of ['ಕನ್ನಡ', 'हिन्दी', 'English']) {
      expect(await screen.findByRole('button', { name: label })).toBeInTheDocument();
    }
  });
});
