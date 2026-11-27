import type { Entry } from '../domain/types';
import { useApp } from './AppContext';
import LedgerRow from './LedgerRow';

/** Newest first: by date, then by when it was recorded. */
export const newestFirst = (a: Entry, b: Entry) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

export default function Ledger() {
  const { t, entries, employers } = useApp();
  const name = (id: string) => employers.find((e) => e.id === id)?.name ?? '?';

  if (entries.length === 0) return <p className="text-center text-slate-600">{t.noEntries}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {[...entries].sort(newestFirst).map((e) => (
        <LedgerRow key={e.id} entry={e} employerName={name(e.employerId)} />
      ))}
    </ul>
  );
}
