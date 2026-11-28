import { daysWorked, totals } from '../domain/ledger';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import Avatar from './Avatar';
import CallEmployer from './CallEmployer';
import EmptyState from './EmptyState';

export default function Employers({ onStatement }: { onStatement: (employerId: string) => void }) {
  const { t, entries, employers } = useApp();
  if (employers.length === 0) return <EmptyState icon="👷" text={t.noEmployers} />;

  return (
    <ul className="stagger flex flex-col gap-4">
      {employers.map((emp) => {
        const sum = totals(entries, emp.id);
        return (
          <li key={emp.id} data-testid="employer-card" className="card overflow-hidden p-4">
            <div className="flex items-center gap-3">
              <Avatar name={emp.name} size="h-14 w-14 text-2xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-2xl font-bold text-[#F5F3FA]">{emp.name}</p>
                <p className="text-sm font-medium text-[#ABA5BD]">
                  {t.daysWorked}: <span className="font-bold text-[#F5F3FA]">{daysWorked(entries, emp.id)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-[#ABA5BD]">{t.outstanding}</p>
                <p className="text-2xl font-extrabold tabular-nums text-[#6EE7A8]">{inr(sum.outstanding)}</p>
              </div>
            </div>
            <dl className="well mt-3.5 grid grid-cols-3 gap-2 p-3 text-center">
              <div>
                <dt className="text-xs font-semibold text-[#ABA5BD]">{t.earned}</dt>
                <dd className="text-lg font-bold tabular-nums text-[#F5F3FA]">{inr(sum.earned)}</dd>
              </div>
              <div className="border-x border-white/10">
                <dt className="text-xs font-semibold text-[#ABA5BD]">{t.advances}</dt>
                <dd className="text-lg font-bold tabular-nums text-[#FB7185]">{inr(sum.advances)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[#ABA5BD]">{t.payments}</dt>
                <dd className="text-lg font-bold tabular-nums text-[#5EEAD4]">{inr(sum.payments)}</dd>
              </div>
            </dl>
            <button type="button" onClick={() => onStatement(emp.id)} className="btn btn-primary mt-3.5 h-12 w-full">
              📄 {t.statementBtn}
            </button>
            <CallEmployer employer={emp} />
          </li>
        );
      })}
    </ul>
  );
}
