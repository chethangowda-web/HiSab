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
    <div className="flex flex-col gap-4">
      <div className="card p-5">
        <p className="eyebrow">{t.total}</p>
        <p data-testid="payments-total" className="mt-1 text-5xl font-extrabold tracking-tight tabular-nums text-[#1C1917]">
          {inr(total)}
        </p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map((e) => {
          const style = TYPE_STYLE[e.type];
          return (
            <li key={e.id} data-testid="payment-row" className="row flex items-center gap-3 p-3.5">
              <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${style.chip}`}>
                {style.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold text-[#1C1917]">{name(e.employerId)}</span>
                <span className="block text-sm font-medium text-[#6B6259]">
                  {typeLabel(lang, e.type)} · {friendlyDate(lang, e.date, today)}
                </span>
              </span>
              <span className={`text-xl font-extrabold tabular-nums ${style.amount}`}>{inr(e.amount)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
