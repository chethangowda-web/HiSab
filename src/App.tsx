import { useState } from 'react';
import type { Lang } from './domain/types';
import { LANGUAGES } from './i18n/ui';
import { AppProvider, useApp } from './ui/AppContext';
import Employers from './ui/Employers';
import Home from './ui/Home';
import Ledger from './ui/Ledger';
import Payments from './ui/Payments';
import Settings from './ui/Settings';
import Statement from './ui/Statement';

type Tab = 'home' | 'ledger' | 'employers' | 'payments' | 'settings';

const SHORT: Record<Lang, string> = { 'kn-IN': 'ಕ', 'hi-IN': 'हि', 'en-IN': 'EN' };

function Header() {
  const { lang, setLang } = useApp();
  return (
    <header className="no-print flex items-center justify-between gap-3 px-4 pb-2 pt-4">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-2xl shadow">
          🎙️
        </span>
        <h1 className="text-2xl font-extrabold leading-tight text-teal-800">BoliHisab</h1>
      </div>
      <div role="group" aria-label="Language" className="flex shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-300">
        {LANGUAGES.map((l) => (
          <button
            key={l.lang}
            type="button"
            aria-label={`Language: ${l.label}`}
            aria-pressed={lang === l.lang}
            onClick={() => setLang(l.lang)}
            className={`h-11 w-11 text-base font-bold transition-colors ${lang === l.lang ? 'bg-teal-700 text-white' : 'text-slate-700 active:bg-slate-100'}`}
          >
            {SHORT[l.lang]}
          </button>
        ))}
      </div>
    </header>
  );
}

function Loading() {
  const { t } = useApp();
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-20 text-slate-600">
      <span aria-hidden="true" className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
      <p>{t.loading}</p>
    </div>
  );
}

function Shell() {
  const { t, demoMode, ready } = useApp();
  const [tab, setTab] = useState<Tab>('home');
  const [statementFor, setStatementFor] = useState<string | null>(null);
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: t.navHome, icon: '🏠' },
    { id: 'ledger', label: t.navLedger, icon: '📒' },
    { id: 'employers', label: t.navEmployers, icon: '👷' },
    { id: 'payments', label: t.navPayments, icon: '💰' },
    { id: 'settings', label: t.navSettings, icon: '⚙️' },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <Header />
      {demoMode && (
        <div role="status" className="no-print mx-4 rounded-2xl bg-amber-500 px-4 py-2 text-center font-bold text-black">
          <span>{t.demoBanner}</span>
          <span className="block text-sm font-normal">{t.demoNote}</span>
        </div>
      )}
      <main className="flex-1 px-4 py-4" aria-busy={!ready}>
        {/* Wait for the ledger to load: acting on an empty ledger would give wrong answers. */}
        {!ready && <Loading />}
        {ready && tab === 'home' && <Home />}
        {ready && tab === 'ledger' && <Ledger />}
        {ready && tab === 'employers' &&
          (statementFor ? (
            <Statement employerId={statementFor} onBack={() => setStatementFor(null)} />
          ) : (
            <Employers onStatement={setStatementFor} />
          ))}
        {ready && tab === 'payments' && <Payments />}
        {ready && tab === 'settings' && <Settings />}
      </main>
      <nav className="no-print sticky bottom-0 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur">
        {tabs.map((x) => {
          const active = tab === x.id;
          return (
            <button
              key={x.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                setTab(x.id);
                setStatementFor(null);
              }}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-0.5 text-xs font-semibold leading-tight ${
                active ? 'text-teal-700' : 'text-slate-600 active:bg-slate-100'
              }`}
            >
              {active && <span aria-hidden="true" className="absolute inset-x-3 top-0 h-1 rounded-b-full bg-teal-600" />}
              <span aria-hidden="true" className="text-2xl leading-none">
                {x.icon}
              </span>
              <span>{x.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
