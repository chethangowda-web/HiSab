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
    <span aria-hidden="true" className="glass-circle relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden">
      <span
        className="absolute inset-1.5 rounded-full opacity-85"
        style={{ background: 'conic-gradient(from 200deg, #ff8a3d, #ff2d87, #8b5cf6, #22d3ee, #ff8a3d)', filter: 'blur(6px)' }}
      />
      <svg viewBox="0 0 24 24" className="relative h-5 w-5 fill-white/95">
        <path d="M12 2.5 14.3 9.7 21.5 12 14.3 14.3 12 21.5 9.7 14.3 2.5 12 9.7 9.7Z" />
      </svg>
    </span>
  );
}

function TabIcon({ id, active }: { id: Tab; active?: boolean }) {
  const cls = `h-6 w-6 ${active ? 'nav-active-icon' : ''}`;
  const stroke = active ? 'url(#hisab-grad)' : 'currentColor';
  switch (id) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'ledger':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="3" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case 'employers':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
          <circle cx="17.5" cy="9" r="2.3" />
          <path d="M16.5 14.5a4.5 4.5 0 0 1 4 4.5" />
        </svg>
      );
    case 'payments':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="5.5" width="19" height="13" rx="3" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}

function Header() {
  const { lang, setLang, setTab } = useApp();
  return (
    <header className="no-print flex items-center justify-between gap-2 px-3 pb-2 pt-3.5">
      <button type="button" aria-label="BoliHisab Home" onClick={() => setTab('home')} className="rounded-full transition active:scale-95">
        <BrandMark />
      </button>

      <div className="glass flex min-w-0 items-center gap-2 rounded-full px-3.5 py-1.5">
        <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
          <span className="h-2 w-2 rounded-full bg-[#6EE7A8] shadow-[0_0_10px_2px_rgba(110,231,168,0.85)]" />
        </span>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-[14px] font-extrabold tracking-tight text-white">BoliHisab</h1>
          <p className="truncate text-[10px] font-semibold tracking-wide text-[#9E97B5]">Voice Khata</p>
        </div>
      </div>

      <div role="group" aria-label="Language" className="glass flex shrink-0 gap-0.5 rounded-full p-1">
        {LANGUAGES.map((l) => (
          <button
            key={l.lang}
            type="button"
            aria-label={`Language: ${l.label}`}
            aria-pressed={lang === l.lang}
            onClick={() => setLang(l.lang)}
            className={`h-9 w-9 rounded-full text-xs font-extrabold transition-all duration-300 ${
              lang === l.lang ? 'grad-accent shadow-[0_6px_18px_-5px_rgba(255,45,135,0.95)]' : 'text-[#9E97B5] hover:bg-white/10 hover:text-white'
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
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
      <div className="skeleton h-44 w-44 !rounded-full" />
      <div className="skeleton h-5 w-40" />
      <div className="skeleton h-16 w-full" />
      <p className="text-sm font-semibold text-[#9E97B5]">{t.loading}</p>
    </div>
  );
}

function Shell() {
  const { t, ready, tab, setTab, statementFor, openStatement, closeStatement } = useApp();
  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: t.navHome },
    { id: 'ledger', label: t.navLedger },
    { id: 'employers', label: t.navEmployers },
    { id: 'payments', label: t.navPayments },
    { id: 'settings', label: t.navSettings },
  ];
  const isHome = ready && tab === 'home';

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="hisab-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF9A4D" />
            <stop offset="52%" stopColor="#FF2D87" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <Header />
      <main className={`flex flex-1 flex-col ${isHome ? '' : 'px-4 pb-6 pt-3'}`} aria-busy={!ready}>
        <div key={ready ? `${tab}-${statementFor ?? ''}` : 'loading'} className={`page-enter flex flex-1 flex-col ${isHome ? '' : ''}`}>
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
        </div>
      </main>
      <nav className="no-print sticky bottom-0 z-30 mx-auto w-full max-w-md bg-gradient-to-t from-[#040407] via-[#040407]/95 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <div className="nav-dock grid grid-cols-5 px-1.5">
          {tabs.map((x) => {
            const active = tab === x.id;
            return (
              <button
                key={x.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setTab(x.id)}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 pb-2 pt-2 text-[11px] font-bold leading-tight transition-all duration-300 active:scale-95 ${
                  active ? 'text-white' : 'text-[#8C85A3] hover:text-white'
                }`}
              >
                <span aria-hidden="true" className={`transition-transform duration-300 ${active ? '-translate-y-0.5 scale-110' : ''}`}>
                  <TabIcon id={x.id} active={active} />
                </span>
                <span className="max-w-full truncate">{x.label}</span>
                {active && <span aria-hidden="true" className="nav-dot" />}
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
