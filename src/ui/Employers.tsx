import { daysWorked, totals } from '../domain/ledger';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';

export default function Employers({ onStatement }: { onStatement: (employerId: string) => void }) {
  const { t, entries, employers } = useApp();
  if (employers.length === 0) return <p className="text-center text-slate-600">{t.noEmployers}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {employers.map((emp) => {
        const sum = totals(entries, emp.id);
        return (
          <li key={emp.id} data-testid="employer-card" className="rounded-2xl bg-white p-4 shadow">
            <p className="text-2xl font-semibold">{emp.name}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              <dt className="text-slate-600">{t.daysWorked}</dt>
              <dd className="text-right font-semibold">{daysWorked(entries, emp.id)}</dd>
              <dt className="text-slate-600">{t.earned}</dt>
              <dd className="text-right font-semibold">{inr(sum.earned)}</dd>
              <dt className="text-slate-600">{t.advances}</dt>
              <dd className="text-right font-semibold">{inr(sum.advances)}</dd>
              <dt className="text-slate-600">{t.payments}</dt>
              <dd className="text-right font-semibold">{inr(sum.payments)}</dd>
              <dt className="font-semibold text-teal-900">{t.outstanding}</dt>
              <dd className="text-right text-xl font-bold text-teal-900">{inr(sum.outstanding)}</dd>
            </dl>
            <button
              type="button"
              onClick={() => onStatement(emp.id)}
              className="mt-3 h-12 rounded-xl bg-teal-100 px-4 text-base font-semibold text-teal-900"
            >
              {t.statementBtn}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
