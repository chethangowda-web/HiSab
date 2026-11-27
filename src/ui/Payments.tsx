import { friendlyDate, typeLabel } from '../i18n/messages';
import { localISODate } from '../domain/dates';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import EmptyState from './EmptyState';
import { newestFirst } from './Ledger';
import { TYPE_STYLE } from './typeStyle';

/** Money that moved to the worker: advances and payments. */
export default function Payments() {
  const { t, lang, entries, employers } = useApp();
  const rows = entries.filter((e) => e.type === 'advance' || e.type === 'payment').sort(newestFirst);
  const name = (id: string) => employers.find((e) => e.id === id)?.name ?? '?';
  if (rows.length === 0) return <EmptyState icon="💰" text={t.noPayments} />;
  const total = rows.reduce((s, e) => s + e.amount, 0);
  const today = localISODate();

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg">
        <p className="text-lg text-amber-50">{t.total}</p>
        <p data-testid="payments-total" className="text-5xl font-extrabold tracking-tight">
          {inr(total)}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((e) => {
          const style = TYPE_STYLE[e.type];
          return (
            <li key={e.id} data-testid="payment-row" className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${style.chip}`}>
                {style.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold">{name(e.employerId)}</span>
                <span className="block text-slate-600">
                  {typeLabel(lang, e.type)} · {friendlyDate(lang, e.date, today)}
                </span>
              </span>
              <span className={`text-xl font-extrabold ${style.amount}`}>{inr(e.amount)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
