import { lastNDays, localISODate } from '../domain/dates';
import type { Entry, Lang } from '../domain/types';

const LABELS: Record<Lang, { title: string; daysLabel: (n: number) => string; weekdays: string[] }> = {
  'en-IN': {
    title: 'Last 7 days',
    daysLabel: (n) => `${n}d worked`,
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },
  'hi-IN': {
    title: 'पिछले 7 दिन',
    daysLabel: (n) => `${n} दिन काम`,
    weekdays: ['र', 'सो', 'मं', 'बु', 'गु', 'शु', 'श'],
  },
  'kn-IN': {
    title: 'ಕಳೆದ 7 ದಿನಗಳು',
    daysLabel: (n) => `${n} ದಿನ ಕೆಲಸ`,
    weekdays: ['ಭಾ', 'ಸೋ', 'ಮಂ', 'ಬು', 'ಗು', 'ಶು', 'ಶ'],
  },
};

/**
 * Visual 7-day work & confirmation calendar strip designed for instant comprehension without dense tables.
 */
export default function WeekStrip({
  entries,
  lang,
  today = localISODate(),
  compact = false,
}: {
  entries: Entry[];
  lang: Lang;
  today?: string;
  compact?: boolean;
}) {
  const copy = LABELS[lang];
  const days = lastNDays(today, 7).map((iso) => {
    const dayRows = entries.filter((e) => e.date === iso);
    const hasWork = dayRows.some((e) => e.type === 'work' || e.type === 'overtime');
    const hasMoney = dayRows.some((e) => e.type === 'advance' || e.type === 'payment');
    const confirmed = dayRows.some((e) => e.source === 'employer_confirmed');
    const d = new Date(`${iso}T12:00:00`);
    return {
      iso,
      wd: copy.weekdays[d.getDay()],
      num: Number(iso.slice(8, 10)),
      hasWork,
      hasMoney,
      confirmed,
      isToday: iso === today,
    };
  });

  const workedCount = days.filter((d) => d.hasWork).length;

  return (
    <div data-testid="week-strip" className={`well ${compact ? 'px-3 py-2.5' : 'px-3.5 py-3'}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow">{copy.title}</span>
        <span className="text-xs font-bold text-[#6EE7B7]">{copy.daysLabel(workedCount)}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => (
          <div key={d.iso} className="flex flex-col items-center gap-1">
            <span className={`text-[10px] font-bold ${d.isToday ? 'text-white' : 'text-[#8C85A3]'}`}>{d.wd}</span>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold tabular-nums transition-all ${
                d.confirmed
                  ? 'border-2 border-[#6EE7B7] bg-emerald-400/25 text-[#A7F3D0] shadow-[0_0_12px_-2px_rgba(110,231,183,0.75)]'
                  : d.hasWork
                    ? 'bg-gradient-to-br from-[#34D399]/30 to-[#38BDF8]/25 text-[#6EE7B7] ring-1 ring-[#6EE7B7]/40'
                    : d.hasMoney
                      ? 'bg-[#FF2D87]/20 text-[#FF85B8] ring-1 ring-[#FF2D87]/40'
                      : d.isToday
                        ? 'border border-white/25 bg-white/[0.06] text-white'
                        : 'bg-white/[0.03] text-[#736C8A]'
              }`}
            >
              {d.num}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
