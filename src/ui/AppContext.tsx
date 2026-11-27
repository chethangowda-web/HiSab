import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Employer, Entry, Lang } from '../domain/types';
import { clearDemoData, db, listEmployers, listEntries } from '../db/db';
import { seedDemoData } from '../db/seed';
import { isLang, uiText, type UiText } from '../i18n/ui';

interface AppState {
  lang: Lang;
  setLang(lang: Lang): void;
  t: UiText;
  /** Only the rows for the current mode: real records, or demo records in demo mode. */
  entries: Entry[];
  employers: Employer[];
  /** Re-reads entries and employers from the database. */
  reload(): Promise<void>;
  /** False until settings and records have been read; nothing should act on the ledger before then. */
  ready: boolean;
  demoMode: boolean;
  setDemoMode(on: boolean): Promise<void>;
  workerName: string;
  setWorkerName(name: string): void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en-IN');
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [allEmployers, setAllEmployers] = useState<Employer[]>([]);
  const [demoMode, setDemoModeState] = useState(false);
  const [workerName, setWorkerNameState] = useState('');
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [e, m] = await Promise.all([listEntries(), listEmployers()]);
    setAllEntries(e);
    setAllEmployers(m);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [l, d, n] = await Promise.all([db.settings.get('language'), db.settings.get('demoMode'), db.settings.get('workerName')]);
      if (!alive) return;
      if (l && isLang(l.value)) setLangState(l.value);
      if (d?.value === true) setDemoModeState(true);
      if (n && typeof n.value === 'string') setWorkerNameState(n.value);
      await reload();
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    void db.settings.put({ key: 'language', value: l });
  }, []);

  const setWorkerName = useCallback((name: string) => {
    setWorkerNameState(name);
    void db.settings.put({ key: 'workerName', value: name });
  }, []);

  const setDemoMode = useCallback(
    async (on: boolean) => {
      // Hide the content while switching, so nothing can be saved halfway: it could be
      // tagged wrongly or deleted by the seeding.
      setReady(false);
      try {
        if (on) await seedDemoData();
        else await clearDemoData();
        await db.settings.put({ key: 'demoMode', value: on });
        setDemoModeState(on);
        await reload();
      } finally {
        setReady(true);
      }
    },
    [reload],
  );

  const value = useMemo<AppState>(
    () => ({
      lang,
      setLang,
      t: uiText(lang),
      entries: allEntries.filter((e) => (e.demo === true) === demoMode),
      employers: allEmployers.filter((e) => (e.demo === true) === demoMode),
      reload,
      ready,
      demoMode,
      setDemoMode,
      workerName,
      setWorkerName,
    }),
    [lang, setLang, allEntries, allEmployers, reload, ready, demoMode, setDemoMode, workerName, setWorkerName],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
