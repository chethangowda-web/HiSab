import { useState } from 'react';
import { AppProvider, useApp } from './ui/AppContext';
import Employers from './ui/Employers';
import Home from './ui/Home';
import Ledger from './ui/Ledger';
import Payments from './ui/Payments';
import Settings from './ui/Settings';

type Tab = 'home' | 'ledger' | 'employers' | 'payments' | 'settings';

function Shell() {
  const { t } = useApp();
  const [tab, setTab] = useState<Tab>('home');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: t.navHome },
    { id: 'ledger', label: t.navLedger },
    { id: 'employers', label: t.navEmployers },
    { id: 'payments', label: t.navPayments },
    { id: 'settings', label: t.navSettings },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <header className="px-4 pb-2 pt-4">
        <h1 className="text-3xl font-bold text-teal-700">BoliHisab</h1>
        <p className="text-slate-600">{t.appTagline}</p>
      </header>
      <main className="flex-1 px-4 py-4">
        {tab === 'home' && <Home />}
        {tab === 'ledger' && <Ledger />}
        {tab === 'employers' && <Employers />}
        {tab === 'payments' && <Payments />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav className="sticky bottom-0 grid grid-cols-5 border-t border-slate-200 bg-white">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-current={tab === x.id ? 'page' : undefined}
            onClick={() => setTab(x.id)}
            className={`min-h-14 px-1 text-base font-semibold ${tab === x.id ? 'text-teal-700' : 'text-slate-600'}`}
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
