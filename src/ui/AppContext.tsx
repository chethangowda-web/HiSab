import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Employer, Entry, Lang } from '../domain/types';
import { db, listEmployers, listEntries } from '../db/db';
import { detectLanguage, isLang, uiText, type UiText } from '../i18n/ui';

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
  workerName: string;
  setWorkerName(name: string): void;
  /** Optional local AI model helps with sentences the rules cannot understand. */
  edgeMode: boolean;
  setEdgeMode(on: boolean): void;
  /** Which screen is showing; lifted here so a voice command can navigate. */
  tab: Tab;
  setTab(tab: Tab): void;
  /** Employer whose statement is open (on the Employers tab), if any. */
  statementFor: string | null;
  openStatement(employerId: string): void;
  closeStatement(): void;
  /** Keep a clip of the worker's voice with each spoken entry (default on). */
  keepProof: boolean;
  setKeepProof(on: boolean): void;
  /** Use Wispr Flow for speech when the server has it (default on). */
  useWispr: boolean;
  setUseWispr(on: boolean): void;
}

export type Tab = 'home' | 'ledger' | 'employers' | 'payments' | 'settings';

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectLanguage());
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [allEmployers, setAllEmployers] = useState<Employer[]>([]);
  const [workerName, setWorkerNameState] = useState('');
  const [ready, setReady] = useState(false);
  const [edgeMode, setEdgeModeState] = useState(false);
  const [tab, setTabState] = useState<Tab>('home');
  const [statementFor, setStatementFor] = useState<string | null>(null);
  const [keepProof, setKeepProofState] = useState(true);
  const [useWispr, setUseWisprState] = useState(true);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    setStatementFor(null);
  }, []);
  const openStatement = useCallback((employerId: string) => {
    setTabState('employers');
    setStatementFor(employerId);
  }, []);
  const closeStatement = useCallback(() => setStatementFor(null), []);

  const reload = useCallback(async () => {
    const [e, m] = await Promise.all([listEntries(), listEmployers()]);
    setAllEntries(e);
    setAllEmployers(m);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [l, n, g] = await Promise.all([
          db.settings.get('language'),
          db.settings.get('workerName'),
          db.settings.get('edgeMode'),
        ]);
        const [kp, uw] = await Promise.all([db.settings.get('keepProof'), db.settings.get('useWispr')]);
        if (!alive) return;
        if (l && isLang(l.value)) setLangState(l.value);
        if (n && typeof n.value === 'string') setWorkerNameState(n.value);
        if (g?.value === true) setEdgeModeState(true);
        if (kp?.value === false) setKeepProofState(false);
        if (uw?.value === false) setUseWisprState(false);
        // Demo mode was removed: drop any leftover sample rows it created earlier.
        type Flagged = { demo?: boolean };
        await db.entries.bulkDelete(await db.entries.filter((e) => (e as Flagged).demo === true).primaryKeys());
        await db.employers.bulkDelete(await db.employers.filter((e) => (e as Flagged).demo === true).primaryKeys());
        await db.clips.bulkDelete(await db.clips.filter((c) => (c as Flagged).demo === true).primaryKeys());
        await reload();
      } catch {
        // If IndexedDB is unavailable (e.g. private browsing), still open the UI instead of hanging on Loading.
      } finally {
        if (alive) setReady(true);
      }
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

  const setKeepProof = useCallback((on: boolean) => {
    setKeepProofState(on);
    void db.settings.put({ key: 'keepProof', value: on });
  }, []);
  const setUseWispr = useCallback((on: boolean) => {
    setUseWisprState(on);
    void db.settings.put({ key: 'useWispr', value: on });
  }, []);

  const setEdgeMode = useCallback((on: boolean) => {
    setEdgeModeState(on);
    void db.settings.put({ key: 'edgeMode', value: on });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      lang,
      setLang,
      t: uiText(lang),
      entries: allEntries,
      employers: allEmployers,
      reload,
      ready,
      workerName,
      setWorkerName,
      edgeMode,
      setEdgeMode,
      tab,
      setTab,
      statementFor,
      openStatement,
      closeStatement,
      keepProof,
      setKeepProof,
      useWispr,
      setUseWispr,
    }),
    [keepProof, setKeepProof, useWispr, setUseWispr, lang, setLang, allEntries, allEmployers, reload, ready, workerName, setWorkerName, edgeMode, setEdgeMode, tab, setTab, statementFor, openStatement, closeStatement],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
