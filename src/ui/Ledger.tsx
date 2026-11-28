import { localISODate } from '../domain/dates';
import type { Entry } from '../domain/types';
import { friendlyDate } from '../i18n/messages';
import { useApp } from './AppContext';
import EmptyState from './EmptyState';
import LedgerRow from './LedgerRow';

/** Newest first: by date, then by when it was recorded. */
export const newestFirst = (a: Entry, b: Entry) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

export default function Ledger() {
  const { t, lang, entries, employers } = useApp();
  const name = (id: string) => employers.find((e) => e.id === id)?.name ?? '?';

  if (entries.length === 0) return <EmptyState icon="📒" text={t.noEntries} />;

  // Group by date, keeping newest first.
  const groups: { date: string; rows: Entry[] }[] = [];
  for (const e of [...entries].sort(newestFirst)) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.rows.push(e);
    else groups.push({ date: e.date, rows: [e] });
  }
  const today = localISODate();

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.date}>
          <h3 className="eyebrow mb-2.5 px-1">{friendlyDate(lang, g.date, today)}</h3>
          <ul className="flex flex-col gap-2.5">
            {g.rows.map((e) => (
              <LedgerRow key={e.id} entry={e} employerName={name(e.employerId)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
