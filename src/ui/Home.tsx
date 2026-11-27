import { balance, earned } from '../domain/ledger';
import { localISODate } from '../domain/dates';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import Avatar from './Avatar';
import { useDialogue } from './useDialogue';
import VoicePanel from './VoicePanel';

function Welcome() {
  const { t, setDemoMode } = useApp();
  return (
    <section className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
      <div aria-hidden="true" className="text-5xl">
        👋
      </div>
      <h2 className="mt-2 text-2xl font-bold">{t.welcomeTitle}</h2>
      <p className="mt-2 text-lg text-slate-600">{t.welcomeText}</p>
      <button
        type="button"
        onClick={() => void setDemoMode(true)}
        className="mt-4 h-14 rounded-2xl bg-amber-500 px-6 text-xl font-bold text-black active:bg-amber-600"
      >
        ▶ {t.tryDemo}
      </button>
    </section>
  );
}

/** The balance. `compact` shrinks it to one line while an entry is being confirmed, so Yes/No stay in reach. */
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
      <section className="flex items-baseline justify-between gap-3 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 px-4 py-3 text-white shadow">
        <p className="text-base text-teal-100">{t.owedToYou}</p>
        <p data-testid="owed-total" className="text-2xl font-extrabold">
          {inr(owed)}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 p-5 text-white shadow-lg">
      <p className="text-lg text-teal-100">{t.owedToYou}</p>
      <p data-testid="owed-total" className="text-5xl font-extrabold tracking-tight">
        {inr(owed)}
      </p>
      <p className="mt-1 text-teal-100">
        {t.earnedThisMonth}: <span className="font-bold text-white">{inr(month)}</span>
      </p>

      {rows.length > 0 && (
        <div className="mt-4 border-t border-white/20 pt-3">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-teal-100">{t.byEmployer}</h2>
          <ul data-testid="owed-by-employer" className="flex flex-col gap-2">
            {rows.map(({ e, bal }) => (
              <li key={e.id} className="flex items-center gap-3">
                <Avatar name={e.name} size="h-9 w-9 text-base" />
                <span className="min-w-0 flex-1 break-words text-lg">{e.name}</span>
                <span className="text-lg font-bold">{inr(bal)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { entries, demoMode } = useApp();
  const d = useDialogue();
  const answering = d.phase === 'CONFIRM' || d.phase === 'CLARIFY' || !!d.whatsappText;
  return (
    <div className="flex flex-col gap-5">
      {entries.length === 0 && !demoMode ? <Welcome /> : <Hero compact={answering} />}
      <VoicePanel d={d} />
    </div>
  );
}
