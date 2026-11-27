export type Lang = 'en-IN' | 'hi-IN' | 'kn-IN';
export type EntryType = 'work' | 'overtime' | 'advance' | 'payment';

export interface Entry {
  id: string;
  employerId: string;
  type: EntryType;
  /** Integer INR. */
  amount: number;
  hours?: number;
  /** ISO yyyy-mm-dd. */
  date: string;
  source: 'worker' | 'employer_confirmed';
  rawTranscript: string;
  lang: Lang;
  createdAt: number;
}

export interface Employer {
  id: string;
  name: string;
  dailyRate?: number;
  overtimeRate?: number;
}

export type Draft = Partial<Entry> & { employerName?: string };

export type QueryKind = 'owed' | 'earned' | 'advances' | 'days';

export type Intent =
  | { kind: 'record'; draft: Draft }
  | { kind: 'query'; q: QueryKind; employerName?: string; period?: 'month' | 'all' }
  | { kind: 'confirm' | 'deny' | 'repeat' | 'unknown' };
