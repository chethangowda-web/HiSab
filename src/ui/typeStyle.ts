import type { EntryType } from '../domain/types';

/** Icon and colours per entry type, so meaning does not depend on reading. The text label is always shown too. */
export const TYPE_STYLE: Record<EntryType, { icon: string; chip: string; amount: string }> = {
  work: { icon: '🛠️', chip: 'bg-teal-100 text-teal-900', amount: 'text-teal-800' },
  overtime: { icon: '⏰', chip: 'bg-indigo-100 text-indigo-900', amount: 'text-indigo-800' },
  advance: { icon: '💸', chip: 'bg-amber-100 text-amber-900', amount: 'text-amber-800' },
  payment: { icon: '💰', chip: 'bg-orange-100 text-orange-900', amount: 'text-orange-800' },
};

/** Coloured circle with the first letter of a name. */
const AVATAR_COLOURS = ['bg-teal-600', 'bg-indigo-600', 'bg-amber-600', 'bg-rose-600', 'bg-sky-600', 'bg-emerald-600'];
export function avatarColour(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}
export const initialOf = (name: string): string => (Array.from(name.trim())[0] ?? '?').toUpperCase();
