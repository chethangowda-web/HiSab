import { balance, earned } from '../domain/ledger';
import { localISODate } from '../domain/dates';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import Avatar from './Avatar';
import Orb, { type OrbMood } from './Orb';
import { useDialogue, type UseDialogue } from './useDialogue';
import VoicePanel from './VoicePanel';
import WeekStrip from './WeekStrip';

function moodOf(d: UseDialogue): OrbMood {
  if (d.listening) return 'listening';
  if (d.thinking) return 'thinking';
  if (d.phrase && (d.phase === 'CONFIRM' || d.phase === 'CLARIFY')) return 'speaking';
  return 'idle';
}

/** Sculpted 3D Orb + cosmic greeting: centered cleanly above the controls with zero overlap. */
function Greeting({ d, compact, empty }: { d: UseDialogue; compact: boolean; empty: boolean }) {
  const { t, workerName } = useApp();
  const name = workerName.trim();
  const canTap = d.supported && !d.listening && !d.thinking;
  return (
    <section className={`flex flex-col items-center px-6 text-center ${compact ? 'py-1' : 'my-auto py-3'}`}>
      <div className={`transition-all duration-500 ${compact ? 'my-0.5' : 'mb-3'}`}>
        <Orb mood={moodOf(d)} level={d.level} size={compact ? 104 : 196} onClick={canTap ? d.start : undefined} />
      </div>
      {!compact && (
        <div className="stagger flex flex-col items-center">
          {empty ? (
            <p className="grad-text text-xs font-extrabold uppercase tracking-[0.14em]">{t.welcomeTitle}</p>
          ) : (
            <p className="text-sm font-semibold tracking-wide text-[#9E97B5]">
              <span className="grad-text font-extrabold">{t.namaste}</span>
              {name ? <span className="text-white/90">, {name}</span> : ''}!
            </p>
          )}
          <h2 className="mt-1.5 max-w-[18.5rem] text-[1.85rem] font-extrabold leading-[1.12] tracking-tight text-white">{t.askToday}</h2>
        </div>
      )}
    </section>
  );
}

/** The balance owed: specular obsidian glass card, 7-day strip, luminous money total and clickable per-employer chips. */
function Balance({ compact }: { compact: boolean }) {
  const { t, lang, entries, employers, openStatement } = useApp();
  const owed = employers.reduce((sum, e) => sum + balance(entries, e.id), 0);
  const month = earned(entries, { month: localISODate().slice(0, 7) });
  const rows = employers
    .map((e) => ({ e, bal: balance(entries, e.id) }))
    .filter((r) => r.bal !== 0)
    .sort((a, b) => b.bal - a.bal);

  if (compact) {
    return (
      <section className="card card-enter mx-3 flex items-baseline justify-between gap-3 px-5 py-3">
        <p className="text-sm font-bold text-[#9E97B5]">{t.owedToYou}</p>
        <p data-testid="owed-total" className="money-text text-2xl font-extrabold tabular-nums">
          {inr(owed)}
        </p>
      </section>
    );
  }

  return (
    <section className="card card-enter relative mx-3 overflow-hidden p-4">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#6EE7B7]/14 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-[#8B5CF6]/14 blur-3xl" />
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{t.owedToYou}</p>
          <p data-testid="owed-total" className="money-text mt-0.5 text-4xl font-extrabold tracking-tight tabular-nums">
            {inr(owed)}
          </p>
        </div>
        <div className="well shrink-0 px-3 py-1.5 text-right">
          <p className="text-[11px] font-semibold text-[#9E97B5]">{t.earnedThisMonth}</p>
          <p className="text-sm font-extrabold tabular-nums text-white">
            <span aria-hidden="true" className="text-[#6EE7B7]">▲ </span>
            {inr(month)}
          </p>
        </div>
      </div>

      <div className="relative mt-3">
        <WeekStrip entries={entries} lang={lang} compact />
      </div>

      {rows.length > 0 && (
        <div className="relative mt-3 border-t border-white/[0.07] pt-3">
          <h3 className="eyebrow mb-2">{t.byEmployer}</h3>
          <ul data-testid="owed-by-employer" className="stagger flex flex-wrap gap-2">
            {rows.map(({ e, bal }) => (
              <li key={e.id} className="shrink-0">
                <button type="button" onClick={() => openStatement(e.id)} className="chip py-1 pl-1 pr-3">
                  <Avatar name={e.name} size="h-7 w-7 text-xs" />
                  <span className="min-w-0 break-words text-xs font-semibold text-white">{e.name}</span>
                  <span className="money-text text-xs font-extrabold tabular-nums">{inr(bal)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { entries } = useApp();
  const d = useDialogue();
  const answering = d.phase === 'CONFIRM' || d.phase === 'CLARIFY' || !!d.whatsappText;
  const empty = entries.length === 0;
  return (
    <div className="flex flex-1 flex-col justify-between gap-3">
      <Greeting d={d} compact={answering} empty={empty} />
      {!empty && <Balance compact={answering} />}
      <VoicePanel d={d} />
    </div>
  );
}
