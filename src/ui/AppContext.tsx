import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Employer, Entry, Lang } from '../domain/types';
import { db, listEmployers, listEntries } from '../db/db';
import { isLang, uiText, type UiText } from '../i18n/ui';

interface AppState {
  lang: Lang;
  setLang(lang: Lang): void;
  t: UiText;
  entries: Entry[];
  employers: Employer[];
  /** Re-reads entries and employers from the database. */
  reload(): Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en-IN');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);

  const reload = useCallback(async () => {
    const [e, m] = await Promise.all([listEntries(), listEmployers()]);
    setEntries(e);
    setEmployers(m);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await db.settings.get('language');
      if (alive && saved && isLang(saved.value)) setLangState(saved.value);
      if (alive) await reload();
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    void db.settings.put({ key: 'language', value: l });
  }, []);

  const value = useMemo<AppState>(
    () => ({ lang, setLang, t: uiText(lang), entries, employers, reload }),
    [lang, setLang, entries, employers, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
