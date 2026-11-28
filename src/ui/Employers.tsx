import { daysWorked, totals } from '../domain/ledger';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import Avatar from './Avatar';
import EmptyState from './EmptyState';

export default function Employers({ onStatement }: { onStatement: (employerId: string) => void }) {
  const { t, entries, employers } = useApp();
  if (employers.length === 0) return <EmptyState icon="👷" text={t.noEmployers} />;

  return (
    <ul className="flex flex-col gap-4">
      {employers.map((emp) => {
        const sum = totals(entries, emp.id);
        return (
          <li key={emp.id} data-testid="employer-card" className="fintech-card overflow-hidden p-4">
            <div className="flex items-center gap-3">
              <Avatar name={emp.name} size="h-14 w-14 text-2xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-2xl font-bold text-[#F3F7EC]">{emp.name}</p>
                <p className="text-sm font-medium text-[#9BB08B]">
                  {t.daysWorked}: <span className="font-bold text-[#E5F0D8]">{daysWorked(entries, emp.id)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-[#9BB08B]">{t.outstanding}</p>
                <p className="text-2xl font-extrabold tabular-nums text-[#C9F43A]">{inr(sum.outstanding)}</p>
              </div>
            </div>
            <dl className="mt-3.5 grid grid-cols-3 gap-2 rounded-2xl border border-[#25381A] bg-[#0F180A] p-3 text-center">
              <div>
                <dt className="text-xs font-semibold text-[#8EA37D]">{t.earned}</dt>
                <dd className="text-lg font-bold tabular-nums text-[#F3F7EC]">{inr(sum.earned)}</dd>
              </div>
              <div className="border-x border-[#25381A]">
                <dt className="text-xs font-semibold text-[#8EA37D]">{t.advances}</dt>
                <dd className="text-lg font-bold tabular-nums text-rose-300">{inr(sum.advances)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[#8EA37D]">{t.payments}</dt>
                <dd className="text-lg font-bold tabular-nums text-emerald-300">{inr(sum.payments)}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => onStatement(emp.id)}
              className="mt-3.5 h-12 w-full rounded-full bg-[#C9F43A] px-4 text-base font-extrabold text-[#0B1307] shadow-sm transition active:scale-[0.98]"
            >
              📄 {t.statementBtn}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
