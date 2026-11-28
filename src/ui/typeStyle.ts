import type { EntryType } from '../domain/types';

/** High-contrast fintech colours per entry type on Obsidian Olive surfaces. */
export const TYPE_STYLE: Record<EntryType, { icon: string; chip: string; amount: string }> = {
  work: { icon: '🛠️', chip: 'bg-[#213517] text-[#C9F43A] border border-[#385727]', amount: 'text-[#C9F43A]' },
  overtime: { icon: '⏰', chip: 'bg-[#233217] text-[#FDE047] border border-[#475F2A]', amount: 'text-[#FDE047]' },
  advance: { icon: '💸', chip: 'bg-[#351923] text-[#FB7185] border border-[#5B283A]', amount: 'text-[#FB7185]' },
  payment: { icon: '💰', chip: 'bg-[#1D3525] text-[#4ADE80] border border-[#2D553B]', amount: 'text-[#4ADE80]' },
};

/** Soft olive/lime/emerald avatar pills with crisp contrast. */
const AVATAR_COLOURS = [
  'bg-[#C9F43A] text-[#0B1307]',
  'bg-[#263C1A] text-[#D9F76E] border border-[#3E612A]',
  'bg-[#3A4D1A] text-[#F4FCE2] border border-[#587428]',
  'bg-[#1B3A2C] text-[#6EE7B7] border border-[#2C5B46]',
  'bg-[#3B3014] text-[#FDE047] border border-[#5D4C20]',
  'bg-[#131F0D] text-[#E6FA9C] border border-[#334F24]',
];
export function avatarColour(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}
export const initialOf = (name: string): string => (Array.from(name.trim())[0] ?? '?').toUpperCase();
