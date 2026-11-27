import { earned, balance } from '../domain/ledger';
import { localISODate } from '../domain/dates';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import VoicePanel from './VoicePanel';

export default function Home() {
  const { t, entries, employers } = useApp();
  const owed = employers.reduce((sum, e) => sum + balance(entries, e.id), 0);
  const month = earned(entries, { month: localISODate().slice(0, 7) });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow">
          <p className="text-sm text-slate-600">{t.owedToYou}</p>
          <p data-testid="owed-total" className="text-3xl font-bold text-teal-800">
            {inr(owed)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow">
          <p className="text-sm text-slate-600">{t.earnedThisMonth}</p>
          <p className="text-3xl font-bold text-slate-800">{inr(month)}</p>
        </div>
      </div>
      {entries.length === 0 && <p className="text-center text-slate-600">{t.tryOneLine}</p>}
      <VoicePanel />
    </div>
  );
}
