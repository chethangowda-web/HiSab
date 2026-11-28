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
  /** The worker's recording of this entry ("voice proof"), if one was kept. */
  clipId?: string;
}

export interface Employer {
  id: string;
  name: string;
  dailyRate?: number;
  overtimeRate?: number;
  /** Phone number in E.164 (+91…), used for the "Call" button. */
  phone?: string;
}

export type Draft = Partial<Entry> & {
  employerName?: string;
  /** Several days of work in one sentence ("3 din"). `amount` is then the per-day amount once normalised. */
  days?: number;
  /** The spoken amount is per day ("700 roz"), not a total. */
  perDay?: boolean;
  /** Where the amount came from: what was said, or the employer's known daily rate. */
  amountFrom?: 'said' | 'rate';
};

export type QueryKind = 'owed' | 'earned' | 'advances' | 'days';

/** Spoken actions: open a statement, send a reminder, delete the last entry, set a daily rate. */
export type CommandKind = 'statement' | 'remind' | 'undo' | 'set_rate';

export type Intent =
  | { kind: 'record'; draft: Draft }
  | { kind: 'query'; q: QueryKind; employerName?: string; period?: 'month' | 'all' }
  | { kind: 'command'; cmd: CommandKind; employerName?: string; amount?: number }
  | { kind: 'confirm' | 'deny' | 'repeat' | 'unknown' };
