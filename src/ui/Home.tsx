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
    <section className="card mx-4 p-5 text-center">
      <span className="pill bg-[#FDEEDE] text-[#9A3F06]">Voice-First Khata</span>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#1C1917]">{t.welcomeTitle}</h2>
      <p className="mt-2 text-base font-medium leading-snug text-[#6B6259]">{t.welcomeText}</p>
    </section>
  );
}

/** The balance owed, large and calm, with this month's earnings and a chip per employer. */
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
      <section className="card mx-4 flex items-baseline justify-between gap-3 px-4 py-3">
        <p className="text-base font-bold text-[#6B6259]">{t.owedToYou}</p>
        <p data-testid="owed-total" className="text-2xl font-extrabold tabular-nums text-[#166534]">
          {inr(owed)}
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4">
      <section className="px-1 text-center">
        <p className="eyebrow">{t.owedToYou}</p>
        <p data-testid="owed-total" className="mt-1 text-6xl font-extrabold tracking-tight tabular-nums text-[#166534]">
          {inr(owed)}
        </p>
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] px-3 py-1 text-sm font-bold text-[#166534]">
          ▲ {t.earnedThisMonth}: <span className="tabular-nums">{inr(month)}</span>
        </p>
      </section>

      {rows.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2 text-center">{t.byEmployer}</h2>
          <ul data-testid="owed-by-employer" className="flex flex-wrap justify-center gap-2">
            {rows.map(({ e, bal }) => (
              <li key={e.id} className="row flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5">
                <Avatar name={e.name} size="h-8 w-8 text-sm" />
                <span className="min-w-0 break-words text-sm font-semibold text-[#1C1917]">{e.name}</span>
                <span className="text-sm font-extrabold tabular-nums text-[#166534]">{inr(bal)}</span>
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
