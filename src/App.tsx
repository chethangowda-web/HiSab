import type { ReactNode } from 'react';
import type { Lang } from './domain/types';
import { LANGUAGES } from './i18n/ui';
import { AppProvider, useApp, type Tab } from './ui/AppContext';
import Employers from './ui/Employers';
import Home from './ui/Home';
import Ledger from './ui/Ledger';
import Payments from './ui/Payments';
import Settings from './ui/Settings';
import Statement from './ui/Statement';

const SHORT: Record<Lang, string> = { 'kn-IN': 'ಕ', 'hi-IN': 'हि', 'en-IN': 'EN' };

function BrandMark() {
  return (
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C2570C] text-white">
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v10" />
        <path d="M8.5 7.5a3.5 3.5 0 0 1 7 0v2.5a3.5 3.5 0 0 1-7 0z" fill="currentColor" fillOpacity="0.22" />
        <path d="M5.5 10.5a6.5 6.5 0 0 0 13 0" />
        <path d="M12 17v4" />
        <path d="M9 21h6" />
      </svg>
    </span>
  );
}

function TabIcon({ id }: { id: Tab }) {
  const cls = 'h-5 w-5';
  switch (id) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'ledger':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="3" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case 'employers':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
          <circle cx="17.5" cy="9" r="2.3" />
          <path d="M16.5 14.5a4.5 4.5 0 0 1 4 4.5" />
        </svg>
      );
    case 'payments':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="5.5" width="19" height="13" rx="3" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}

function Header() {
  const { lang, setLang } = useApp();
  return (
    <header className="no-print flex items-center justify-between gap-2 px-4 pb-2 pt-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark />
        <h1 className="text-xl font-extrabold tracking-tight text-[#1C1917]">BoliHisab</h1>
      </div>
      <div role="group" aria-label="Language" className="flex shrink-0 gap-1 rounded-full border border-[#EADFCB] bg-white p-1">
        {LANGUAGES.map((l) => (
          <button
            key={l.lang}
            type="button"
            aria-label={`Language: ${l.label}`}
            aria-pressed={lang === l.lang}
            onClick={() => setLang(l.lang)}
            className={`h-10 w-11 rounded-full text-sm font-extrabold transition-colors ${
              lang === l.lang ? 'bg-[#C2570C] text-white' : 'text-[#6B6259] hover:bg-[#F3ECDD]'
            }`}
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
    <div role="status" className="flex flex-col items-center gap-3 py-20 text-[#6B6259]">
      <span aria-hidden="true" className="h-9 w-9 animate-spin rounded-full border-4 border-[#EADFCB] border-t-[#C2570C]" />
      <p className="text-sm font-semibold">{t.loading}</p>
    </div>
  );
}

function Shell() {
  const { t, ready, tab, setTab, statementFor, openStatement, closeStatement } = useApp();
  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'home', label: t.navHome, icon: <TabIcon id="home" /> },
    { id: 'ledger', label: t.navLedger, icon: <TabIcon id="ledger" /> },
    { id: 'employers', label: t.navEmployers, icon: <TabIcon id="employers" /> },
    { id: 'payments', label: t.navPayments, icon: <TabIcon id="payments" /> },
    { id: 'settings', label: t.navSettings, icon: <TabIcon id="settings" /> },
  ];
  const isHome = ready && tab === 'home';

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#FAF6EE]">
      <Header />
      <main className={`flex-1 pb-28 ${isHome ? 'pt-2' : 'px-4 pt-3'}`} aria-busy={!ready}>
        {/* Wait for the ledger to load: acting on an empty ledger would give wrong answers. */}
        {!ready && <Loading />}
        {ready && tab === 'home' && <Home />}
        {ready && tab === 'ledger' && <Ledger />}
        {ready && tab === 'employers' &&
          (statementFor ? (
            <Statement employerId={statementFor} onBack={closeStatement} />
          ) : (
            <Employers onStatement={openStatement} />
          ))}
        {ready && tab === 'payments' && <Payments />}
        {ready && tab === 'settings' && <Settings />}
      </main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-[#EADFCB] bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {tabs.map((x) => {
            const active = tab === x.id;
            return (
              <button
                key={x.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setTab(x.id)}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-xs font-bold leading-tight transition-colors ${
                  active ? 'text-[#C2570C]' : 'text-[#6B6259] hover:text-[#1C1917]'
                }`}
              >
                {active && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-1 rounded-b-full bg-[#C2570C]" />}
                <span aria-hidden="true">{x.icon}</span>
                <span className="truncate">{x.label}</span>
              </button>
            );
          })}
        </div>
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
