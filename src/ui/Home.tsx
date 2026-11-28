import { balance, earned } from '../domain/ledger';
import { localISODate } from '../domain/dates';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import Avatar from './Avatar';
import { useDialogue } from './useDialogue';
import VoicePanel from './VoicePanel';

function Welcome() {
  const { t } = useApp();
  return (
    <section className="rounded-b-[28px] bg-gradient-to-b from-[#C4F02E] to-[#DCF873] px-4 pb-5 pt-2 shadow-lg">
      <div className="lime-inner p-5 text-center">
        <span className="inline-flex rounded-full bg-[#0D1609] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#D9F76E]">
          Voice-First Khata
        </span>
        <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-[#0B1307]">{t.welcomeTitle}</h2>
        <p className="mt-1.5 text-sm font-medium leading-snug text-[#1E2E13]">{t.welcomeText}</p>
      </div>
    </section>
  );
}

/** The balance, seamlessly fused with the top lime header bowl just like the fintech reference. */
function Hero({ compact }: { compact: boolean }) {
  const { t, entries, employers } = useApp();
  const owed = employers.reduce((sum, e) => sum + balance(entries, e.id), 0);
  const month = earned(entries, { month: localISODate().slice(0, 7) });
  const rows = employers
    .map((e) => ({ e, bal: balance(entries, e.id) }))
    .filter((r) => r.bal !== 0)
    .sort((a, b) => b.bal - a.bal);

  if (compact) {
    return (
      <section className="rounded-b-[22px] bg-[#C4F02E] px-4 pb-3 pt-1 shadow-md">
        <div className="lime-inner flex items-baseline justify-between gap-3 px-4 py-2.5">
          <p className="text-sm font-bold text-[#1A290F]">{t.owedToYou}</p>
          <p data-testid="owed-total" className="text-xl font-extrabold tabular-nums text-[#0B1307]">
            {inr(owed)}
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-b-[28px] bg-gradient-to-b from-[#C4F02E] to-[#DCF873] px-4 pb-4 pt-1 shadow-[0_14px_34px_-14px_rgba(181,233,34,0.35)]">
        <div className="lime-inner p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#2B3D1B]">{t.owedToYou}</p>
          <p data-testid="owed-total" className="mt-0.5 text-4xl font-extrabold tracking-tight tabular-nums text-[#0B1307]">
            {inr(owed)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#15803D] px-2.5 py-0.5 text-xs font-bold text-white">
              ▲ {t.earnedThisMonth}: <span className="tabular-nums">{inr(month)}</span>
            </span>
          </div>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="px-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8EA37D]">{t.byEmployer}</h2>
          <ul data-testid="owed-by-employer" className="flex flex-wrap gap-2">
            {rows.map(({ e, bal }) => (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-full border border-[#2A3F1D] bg-[#14200D] py-1 pl-1 pr-3.5"
              >
                <Avatar name={e.name} size="h-7 w-7 text-xs" />
                <span className="min-w-0 break-words text-sm font-semibold text-[#F1F6E8]">{e.name}</span>
                <span className="text-sm font-extrabold tabular-nums text-[#C9F43A]">{inr(bal)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function Home() {
  const { entries } = useApp();
  const d = useDialogue();
  const answering = d.phase === 'CONFIRM' || d.phase === 'CLARIFY' || !!d.whatsappText;
  return (
    <div className="flex flex-col gap-4">
      {entries.length === 0 ? <Welcome /> : <Hero compact={answering} />}
      <div className="px-4">
        <VoicePanel d={d} />
      </div>
    </div>
  );
}
