import type { Gold } from './score';

export interface BenchCase {
  text: string;
  gold: Gold;
  lang?: 'en-IN' | 'hi-IN' | 'kn-IN';
  /** Sentences the rule parser is expected to struggle with, or that tempt a model to invent values. */
  hard?: boolean;
}

/**
 * Labelled sentences for comparing parsers and local models.
 * Labels are the author's judgement of what a worker meant; fix any you disagree with.
 */
export const CASES: BenchCase[] = [
  // ---- English ----
  { text: "I worked at Ramesh's construction site today for 700 rupees", gold: { kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700 } },
  { text: 'I worked at Suresh site yesterday for 800 rupees', gold: { kind: 'record', type: 'work', employerName: 'Suresh', amount: 800 } },
  { text: 'worked for Mahesh today 650', gold: { kind: 'record', type: 'work', employerName: 'Mahesh', amount: 650 } },
  { text: 'I worked two extra hours yesterday', gold: { kind: 'record', type: 'overtime', hours: 2 } },
  { text: 'I did 3 hours overtime at Ramesh today', gold: { kind: 'record', type: 'overtime', employerName: 'Ramesh', hours: 3 } },
  { text: 'The contractor gave me 1000 rupees advance', gold: { kind: 'record', type: 'advance', amount: 1000 } },
  { text: 'Ramesh gave me 1,000 rupees advance', gold: { kind: 'record', type: 'advance', employerName: 'Ramesh', amount: 1000 } },
  { text: 'I received 500 rupees from Ramesh', gold: { kind: 'record', type: 'payment', employerName: 'Ramesh', amount: 500 } },
  { text: 'Suresh paid me seven hundred rupees today', gold: { kind: 'record', type: 'payment', employerName: 'Suresh', amount: 700 } },
  { text: 'paid 1500 by Suresh today', gold: { kind: 'record', type: 'payment', employerName: 'Suresh', amount: 1500 } },
  { text: 'How much does Ramesh still owe me?', gold: { kind: 'query', q: 'owed', employerName: 'Ramesh' } },
  { text: 'How much have I earned this month?', gold: { kind: 'query', q: 'earned' } },
  { text: 'How many days did I work at Ramesh', gold: { kind: 'query', q: 'days', employerName: 'Ramesh' } },
  { text: 'How much advance have I taken', gold: { kind: 'query', q: 'advances' } },
  { text: 'yes', gold: { kind: 'confirm' } },
  { text: 'no', gold: { kind: 'deny' } },
  // ---- Hindi / Hinglish ----
  { text: 'Aaj Ramesh ke site pe 700 rupaye kaam kiya', gold: { kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700 }, lang: 'hi-IN' },
  { text: 'Kal Suresh ke yahan saat sau rupaye kaam kiya', gold: { kind: 'record', type: 'work', employerName: 'Suresh', amount: 700 }, lang: 'hi-IN' },
  { text: 'Ramesh ne mujhe ek hazaar rupaye advance diye', gold: { kind: 'record', type: 'advance', employerName: 'Ramesh', amount: 1000 }, lang: 'hi-IN' },
  { text: 'Ramesh ne 500 rupaye diye', gold: { kind: 'record', type: 'payment', employerName: 'Ramesh', amount: 500 }, lang: 'hi-IN' },
  { text: 'Maine aaj do ghante extra kaam kiya', gold: { kind: 'record', type: 'overtime', hours: 2 }, lang: 'hi-IN' },
  { text: 'Ramesh ne kitna dena hai?', gold: { kind: 'query', q: 'owed', employerName: 'Ramesh' }, lang: 'hi-IN' },
  { text: 'Mujhe Ramesh se kitna lena hai', gold: { kind: 'query', q: 'owed', employerName: 'Ramesh' }, lang: 'hi-IN' },
  { text: 'haan', gold: { kind: 'confirm' }, lang: 'hi-IN' },
  { text: 'आज रमेश के साइट पर सात सौ रुपये काम किया', gold: { kind: 'record', type: 'work', employerName: 'रमेश', amount: 700 }, lang: 'hi-IN' },
  { text: 'रमेश ने कितना देना है?', gold: { kind: 'query', q: 'owed', employerName: 'रमेश' }, lang: 'hi-IN' },
  // ---- Kannada ----
  { text: 'ಇವತ್ತು ರಮೇಶ್ ಅವರ ಸೈಟ್‌ನಲ್ಲಿ ಏಳುನೂರು ರೂಪಾಯಿ ಕೆಲಸ ಮಾಡಿದೆ', gold: { kind: 'record', type: 'work', employerName: 'ರಮೇಶ್', amount: 700 }, lang: 'kn-IN' },
  { text: 'ಮಹೇಶ್ ಅವರಿಂದ ಐನೂರು ರೂಪಾಯಿ ಮುಂಗಡ ತೆಗೆದುಕೊಂಡೆ', gold: { kind: 'record', type: 'advance', employerName: 'ಮಹೇಶ್', amount: 500 }, lang: 'kn-IN' },
  { text: 'ರಮೇಶ್ ಅವರು ನನಗೆ ಎಷ್ಟು ಕೊಡಬೇಕು?', gold: { kind: 'query', q: 'owed', employerName: 'ರಮೇಶ್' }, lang: 'kn-IN' },
  { text: 'ಹೌದು', gold: { kind: 'confirm' }, lang: 'kn-IN' },
  // ---- Hard: messy phrasing the rules were not written for ----
  { text: 'ramesh anna kitchen 700 worked today', gold: { kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700 }, hard: true },
  { text: 'kitchen ramesh 700 worked today', gold: { kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700 }, hard: true },
  { text: 'Suresh sir nanage 500 kottaru', gold: { kind: 'record', type: 'payment', employerName: 'Suresh', amount: 500 }, hard: true, lang: 'kn-IN' },
  { text: 'aaj ka kaam 700 Mahesh bhai ne diya', gold: { kind: 'record', type: 'payment', employerName: 'Mahesh', amount: 700 }, hard: true, lang: 'hi-IN' },
  { text: 'tell me Ramesh balance', gold: { kind: 'query', q: 'owed', employerName: 'Ramesh' }, hard: true },
  { text: 'extra three hours Ramesh site yesterday', gold: { kind: 'record', type: 'overtime', employerName: 'Ramesh', hours: 3 }, hard: true },
  { text: 'ek hazaar advance mila contractor se', gold: { kind: 'record', type: 'advance', amount: 1000 }, hard: true, lang: 'hi-IN' },
  { text: 'Ramesh 700', gold: { kind: 'record', employerName: 'Ramesh', amount: 700 }, hard: true },
  // ---- Hard: traps where inventing a value is tempting ----
  { text: 'Ramesh sir gave me some money yesterday', gold: { kind: 'record', type: 'payment', employerName: 'Ramesh' }, hard: true },
  { text: 'he made me work extra yesterday', gold: { kind: 'record', type: 'overtime' }, hard: true },
  { text: 'I earned nothing', gold: { kind: 'unknown' }, hard: true },
  { text: 'worked 700 and advance 200', gold: { kind: 'unknown' }, hard: true },
  { text: 'weather kaisa hai', gold: { kind: 'unknown' } },
];
