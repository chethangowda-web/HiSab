import { typeLabel } from '../i18n/messages';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import { newestFirst } from './Ledger';

/** Money that moved to the worker: advances and payments. */
export default function Payments() {
  const { t, lang, entries, employers } = useApp();
  const rows = entries.filter((e) => e.type === 'advance' || e.type === 'payment').sort(newestFirst);
  const name = (id: string) => employers.find((e) => e.id === id)?.name ?? '?';
  if (rows.length === 0) return <p className="text-center text-slate-600">{t.noPayments}</p>;
  const total = rows.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {rows.map((e) => (
          <li key={e.id} data-testid="payment-row" className="flex items-baseline justify-between rounded-2xl bg-white p-4 shadow">
            <span>
              <span className="text-xl font-semibold">{name(e.employerId)}</span>
              <span className="block text-slate-600">
                {typeLabel(lang, e.type)} · {e.date}
              </span>
            </span>
            <span className="text-xl font-bold text-orange-700">{inr(e.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="text-right text-xl">
        {t.total}: <strong data-testid="payments-total">{inr(total)}</strong>
      </p>
    </div>
  );
}
