import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App';
import { db, listEntries } from '../src/db/db';

const NO_EMPLOYER = 'kitchen ramesh 700 worked today';

const modelSays = (raw: unknown) =>
  vi.fn(async (url: string) =>
    url === '/api/health'
      ? new Response(JSON.stringify({ ok: true }), { status: 200 })
      : new Response(JSON.stringify(raw), { status: 200 }),
  );

beforeEach(async () => {
  await db.entries.clear();
  await db.employers.clear();
  await db.settings.clear();
});
afterEach(() => vi.unstubAllGlobals());

const type = async (text: string) => {
  fireEvent.change(await screen.findByRole('textbox'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /send/i }));
};

describe('edge mode in the app', () => {
  it('is off by default and never calls the model', async () => {
    const f = modelSays({ kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700, hours: null, date: null, q: null, period: null });
    vi.stubGlobal('fetch', f);
    render(<App />);
    await type(NO_EMPLOYER);
    expect(await screen.findByText(/Which employer/i)).toBeInTheDocument(); // rules alone cannot find the name
    expect(f.mock.calls.filter(([url]) => String(url).includes('/api/parse'))).toHaveLength(0);
  });

  it('when on, a sentence the rules cannot finish is completed by the model and saved', async () => {
    await db.settings.put({ key: 'edgeMode', value: true });
    vi.stubGlobal('fetch', modelSays({ kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700, hours: null, date: null, q: null, period: null }));
    render(<App />);
    await type(NO_EMPLOYER);
    await waitFor(async () => expect(await listEntries()).toHaveLength(1));
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent('Ramesh ₹700');
  });

  it('an invented amount from the model never reaches the ledger', async () => {
    await db.settings.put({ key: 'edgeMode', value: true });
    vi.stubGlobal('fetch', modelSays({ kind: 'record', type: 'payment', employerName: 'Ramesh', amount: 800, hours: null, date: null, q: null, period: null }));
    render(<App />);
    await type('Ramesh sir gave me some money yesterday');
    expect(await screen.findByText(/How many rupees/i)).toBeInTheDocument();
    expect(screen.queryByText(/800/)).toBeNull();
  });

  it('when the model server is down, the app quietly uses the rules', async () => {
    await db.settings.put({ key: 'edgeMode', value: true });
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('fetch failed');
    }));
    render(<App />);
    await type('Ramesh ne 500 rupaye diye');
    await waitFor(async () => expect(await listEntries()).toHaveLength(1));
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent('Ramesh ₹500');
  });
});

describe('edge mode in Settings', () => {
  const openSettings = async () => fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));

  it('turns on, is remembered, and shows that the model is connected', async () => {
    vi.stubGlobal('fetch', modelSays({}));
    render(<App />);
    await openSettings();
    fireEvent.click(await screen.findByRole('switch', { name: /smart helper/i }));
    expect(await screen.findByText(/connected to the local model/i)).toBeInTheDocument();
    await waitFor(async () => expect((await db.settings.get('edgeMode'))?.value).toBe(true));
  });

  it('explains how to start it when it is not reachable, without breaking anything', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('fetch failed');
    }));
    render(<App />);
    await openSettings();
    fireEvent.click(await screen.findByRole('switch', { name: /smart helper/i }));
    expect(await screen.findByText(/npm run edge/i)).toBeInTheDocument();
  });

  it('shows Sarvam 105B connected when /api/health reports provider sarvam', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url === '/api/health'
          ? new Response(JSON.stringify({ ok: true, provider: 'sarvam', model: 'sarvam-105b' }), { status: 200 })
          : new Response(JSON.stringify({}), { status: 200 }),
      ),
    );
    render(<App />);
    await openSettings();
    fireEvent.click(await screen.findByRole('switch', { name: /smart helper/i }));
    expect(await screen.findByText(/connected to sarvam 105b/i)).toBeInTheDocument();
  });

  it('turns off again', async () => {
    await db.settings.put({ key: 'edgeMode', value: true });
    vi.stubGlobal('fetch', modelSays({}));
    render(<App />);
    await openSettings();
    const sw = await screen.findByRole('switch', { name: /smart helper/i });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    await waitFor(async () => expect((await db.settings.get('edgeMode'))?.value).toBe(false));
  });
});

describe('Wispr Dictate button removed', () => {
  it('does not show a Wispr Dictate button', async () => {
    render(<App />);
    await screen.findByText(/BoliHisab/);
    expect(screen.queryByRole('button', { name: /wispr dictate/i })).toBeNull();
  });
});
