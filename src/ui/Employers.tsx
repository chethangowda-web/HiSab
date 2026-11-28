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
    <ul className="flex flex-col gap-4">
      {employers.map((emp) => {
        const sum = totals(entries, emp.id);
        return (
          <li key={emp.id} data-testid="employer-card" className="card overflow-hidden p-4">
            <div className="flex items-center gap-3">
              <Avatar name={emp.name} size="h-14 w-14 text-2xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-2xl font-bold text-[#1C1917]">{emp.name}</p>
                <p className="text-sm font-medium text-[#6B6259]">
                  {t.daysWorked}: <span className="font-bold text-[#1C1917]">{daysWorked(entries, emp.id)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-[#6B6259]">{t.outstanding}</p>
                <p className="text-2xl font-extrabold tabular-nums text-[#166534]">{inr(sum.outstanding)}</p>
              </div>
            </div>
            <dl className="well mt-3.5 grid grid-cols-3 gap-2 p-3 text-center">
              <div>
                <dt className="text-xs font-semibold text-[#6B6259]">{t.earned}</dt>
                <dd className="text-lg font-bold tabular-nums text-[#1C1917]">{inr(sum.earned)}</dd>
              </div>
              <div className="border-x border-[#E3D6BE]">
                <dt className="text-xs font-semibold text-[#6B6259]">{t.advances}</dt>
                <dd className="text-lg font-bold tabular-nums text-[#B42318]">{inr(sum.advances)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[#6B6259]">{t.payments}</dt>
                <dd className="text-lg font-bold tabular-nums text-[#0F766E]">{inr(sum.payments)}</dd>
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
