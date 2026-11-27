import { useState } from 'react';
import { AppProvider, useApp } from './ui/AppContext';
import Employers from './ui/Employers';
import Home from './ui/Home';
import Ledger from './ui/Ledger';
import Payments from './ui/Payments';
import Settings from './ui/Settings';
import Statement from './ui/Statement';

type Tab = 'home' | 'ledger' | 'employers' | 'payments' | 'settings';

function Shell() {
  const { t, demoMode, ready } = useApp();
  const [tab, setTab] = useState<Tab>('home');
  const [statementFor, setStatementFor] = useState<string | null>(null);
  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: t.navHome },
    { id: 'ledger', label: t.navLedger },
    { id: 'employers', label: t.navEmployers },
    { id: 'payments', label: t.navPayments },
    { id: 'settings', label: t.navSettings },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <header className="no-print px-4 pb-2 pt-4">
        <h1 className="text-3xl font-bold text-teal-700">BoliHisab</h1>
        <p className="text-slate-600">{t.appTagline}</p>
      </header>
      {demoMode && (
        <div role="status" className="no-print mx-4 rounded-xl bg-amber-500 px-4 py-2 text-center font-bold text-black">
          <span>{t.demoBanner}</span>
          <span className="block text-sm font-normal">{t.demoNote}</span>
        </div>
      )}
      <main className="flex-1 px-4 py-4" aria-busy={!ready}>
        {/* Wait for the ledger to load: acting on an empty ledger would give wrong answers. */}
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
      <nav className="no-print sticky bottom-0 grid grid-cols-5 border-t border-slate-200 bg-white">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-current={tab === x.id ? 'page' : undefined}
            onClick={() => {
              setTab(x.id);
              setStatementFor(null);
            }}
            className={`min-h-14 px-0.5 text-xs font-semibold leading-tight ${tab === x.id ? 'text-teal-700' : 'text-slate-600'}`}
          >
            {x.label}
          </button>
        ))}
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
