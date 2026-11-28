/**
 * Script-independent "sound skeleton" of a name, so "Ramesh", "रमेश" and "ರಮೇಶ್" all match.
 * Devanagari and Kannada share the same Unicode layout, so one consonant table covers both.
 * Vowels are dropped; only consonants are compared.
 */
const CONSONANTS: Record<number, string> = {
  0x15: 'k', 0x16: 'kh', 0x17: 'g', 0x18: 'gh', 0x19: 'n', 0x1a: 'ch', 0x1b: 'chh', 0x1c: 'j', 0x1d: 'jh', 0x1e: 'n',
  0x1f: 't', 0x20: 'th', 0x21: 'd', 0x22: 'dh', 0x23: 'n', 0x24: 't', 0x25: 'th', 0x26: 'd', 0x27: 'dh', 0x28: 'n',
  0x29: 'n', 0x2a: 'p', 0x2b: 'ph', 0x2c: 'b', 0x2d: 'bh', 0x2e: 'm', 0x2f: 'y', 0x30: 'r', 0x31: 'r', 0x32: 'l',
  0x33: 'l', 0x34: 'l', 0x35: 'v', 0x36: 'sh', 0x37: 'sh', 0x38: 's', 0x39: 'h',
};
const BLOCKS = [0x0900, 0x0c80]; // Devanagari, Kannada

export function nameKey(name: string): string {
  let latin = '';
  for (const ch of name.toLowerCase()) {
    const c = ch.codePointAt(0)!;
    const block = BLOCKS.find((b) => c >= b && c < b + 0x80);
    if (block !== undefined) latin += CONSONANTS[c - block] ?? '';
    else if (/[a-z]/.test(ch)) latin += ch;
  }
  return latin
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/f/g, 'ph')
    .replace(/[aeiouy]/g, '')
    .replace(/(.)\1+/g, '$1');
}

const latinOnly = (s: string) => /^[\x00-\x7f]*$/.test(s);

/** True when two names are written in different scripts but sound the same. */
export function sameNameAcrossScripts(a: string, b: string): boolean {
  if (latinOnly(a) === latinOnly(b)) return false;
  const ka = nameKey(a);
  return ka.length >= 2 && ka === nameKey(b);
}
