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
    <div className="stagger flex flex-col gap-4">
      <div className="card relative overflow-hidden p-5">
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#38BDF8]/15 blur-3xl" />
        <p className="eyebrow relative">{t.total}</p>
        <p data-testid="payments-total" className="money-text relative mt-1 text-5xl font-extrabold tracking-tight tabular-nums">
          {inr(total)}
        </p>
      </div>
      <ul className="stagger flex flex-col gap-2.5">
        {rows.map((e) => {
          const style = TYPE_STYLE[e.type];
          return (
            <li key={e.id} data-testid="payment-row" className="row flex items-center gap-3 p-3.5">
              <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${style.chip}`}>
                {style.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold text-[#F5F3FA]">{name(e.employerId)}</span>
                <span className="block text-sm font-medium text-[#ABA5BD]">
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
