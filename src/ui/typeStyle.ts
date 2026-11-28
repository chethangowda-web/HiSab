import type { EntryType } from '../domain/types';

/** Warm, high-contrast colours per entry type on white cards. */
export const TYPE_STYLE: Record<EntryType, { icon: string; chip: string; amount: string }> = {
  work: { icon: '🛠️', chip: 'bg-emerald-400/12 text-[#6EE7A8]', amount: 'text-[#6EE7A8]' },
  overtime: { icon: '⏰', chip: 'bg-amber-300/12 text-[#FCD34D]', amount: 'text-[#FCD34D]' },
  advance: { icon: '💸', chip: 'bg-rose-400/12 text-[#FB7185]', amount: 'text-[#FB7185]' },
  payment: { icon: '💰', chip: 'bg-teal-300/12 text-[#5EEAD4]', amount: 'text-[#5EEAD4]' },
};

/** Soft warm avatar pills with crisp contrast. */
const AVATAR_COLOURS = [
  'bg-[#FF7A2F]/15 text-[#FFB27A]',
  'bg-emerald-400/12 text-[#6EE7A8]',
  'bg-sky-400/15 text-[#A5C8FF]',
  'bg-fuchsia-400/15 text-[#E9B8FF]',
  'bg-amber-300/12 text-[#FCD34D]',
  'bg-teal-300/12 text-[#5EEAD4]',
];
export function avatarColour(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}
export const initialOf = (name: string): string => (Array.from(name.trim())[0] ?? '?').toUpperCase();
