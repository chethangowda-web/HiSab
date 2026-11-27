import type { Entry } from '../domain/types';
import { typeLabel } from '../i18n/messages';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';

/** Newest first: by date, then by when it was recorded. */
export const newestFirst = (a: Entry, b: Entry) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

export default function Ledger() {
  const { t, lang, entries, employers } = useApp();
  const name = (id: string) => employers.find((e) => e.id === id)?.name ?? '?';

  if (entries.length === 0) return <p className="text-center text-slate-600">{t.noEntries}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {[...entries].sort(newestFirst).map((e) => (
        <li key={e.id} data-testid="ledger-row" data-date={e.date} className="rounded-2xl bg-white p-4 shadow">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold">{name(e.employerId)}</span>
            <span className={`text-xl font-bold ${e.type === 'work' || e.type === 'overtime' ? 'text-teal-800' : 'text-orange-700'}`}>
              {inr(e.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>
              {typeLabel(lang, e.type)}
              {e.hours !== undefined ? ` · ${e.hours}h` : ''} · {e.date}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                e.source === 'employer_confirmed' ? 'bg-teal-100 text-teal-900' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {e.source === 'employer_confirmed' ? t.employerConfirmed : t.workerRecorded}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
