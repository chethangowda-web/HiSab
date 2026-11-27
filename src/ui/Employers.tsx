import { daysWorked, totals } from '../domain/ledger';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import Avatar from './Avatar';
import EmptyState from './EmptyState';

export default function Employers({ onStatement }: { onStatement: (employerId: string) => void }) {
  const { t, entries, employers } = useApp();
  if (employers.length === 0) return <EmptyState icon="👷" text={t.noEmployers} />;

  return (
    <ul className="flex flex-col gap-3">
      {employers.map((emp) => {
        const sum = totals(entries, emp.id);
        return (
          <li key={emp.id} data-testid="employer-card" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <Avatar name={emp.name} size="h-14 w-14 text-2xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-2xl font-bold">{emp.name}</p>
                <p className="text-slate-600">
                  {t.daysWorked}: <span className="font-semibold text-slate-900">{daysWorked(entries, emp.id)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-500">{t.outstanding}</p>
                <p className="text-2xl font-extrabold text-teal-800">{inr(sum.outstanding)}</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
              <div>
                <dt className="text-sm text-slate-500">{t.earned}</dt>
                <dd className="text-lg font-bold">{inr(sum.earned)}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">{t.advances}</dt>
                <dd className="text-lg font-bold">{inr(sum.advances)}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">{t.payments}</dt>
                <dd className="text-lg font-bold">{inr(sum.payments)}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => onStatement(emp.id)}
              className="mt-3 h-12 w-full rounded-xl bg-teal-100 px-4 text-lg font-semibold text-teal-900 active:bg-teal-200"
            >
              📄 {t.statementBtn}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
