/** Turns what a person types ("98765 43210", "09876543210", "+91 98765 43210") into +91XXXXXXXXXX, or null. */
export function normalizeIndianMobile(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('0091')) d = d.slice(4);
  else if (d.startsWith('91') && d.length === 12) d = d.slice(2);
  else if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

/** Shows +91XXXXXXXXXX as the 10 digits people type. */
export function displayPhone(e164: string | undefined): string {
  return e164 ? e164.replace(/^\+91/, '') : '';
}
