import type { EntryType } from '../domain/types';

/** Warm, high-contrast colours per entry type on white cards. */
export const TYPE_STYLE: Record<EntryType, { icon: string; chip: string; amount: string }> = {
  work: { icon: '🛠️', chip: 'bg-[#E6F4EA] text-[#166534]', amount: 'text-[#166534]' },
  overtime: { icon: '⏰', chip: 'bg-[#FEF3C7] text-[#92400E]', amount: 'text-[#92400E]' },
  advance: { icon: '💸', chip: 'bg-[#FDECEA] text-[#B42318]', amount: 'text-[#B42318]' },
  payment: { icon: '💰', chip: 'bg-[#E0F2F1] text-[#0F766E]', amount: 'text-[#0F766E]' },
};

/** Soft warm avatar pills with crisp contrast. */
const AVATAR_COLOURS = [
  'bg-[#FDEEDE] text-[#9A3F06]',
  'bg-[#E6F4EA] text-[#166534]',
  'bg-[#E0ECFB] text-[#1D4E89]',
  'bg-[#F3E8FB] text-[#6B2C91]',
  'bg-[#FEF3C7] text-[#92400E]',
  'bg-[#E0F2F1] text-[#0F766E]',
];
export function avatarColour(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}
export const initialOf = (name: string): string => (Array.from(name.trim())[0] ?? '?').toUpperCase();
