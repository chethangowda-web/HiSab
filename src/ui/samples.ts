import type { Lang } from '../domain/types';

/**
 * Canned utterances for demo mode "Play sample". They run through the real parser,
 * dialogue and ledger: record an entry, confirm it, then ask the balance.
 * The employer is written as "Ramesh" so it matches the demo ledger in every language.
 */
export const SAMPLES: Record<Lang, string[]> = {
  'en-IN': ['I worked at Ramesh for 700 rupees today', 'yes', 'How much does Ramesh owe me?'],
  'hi-IN': ['Aaj Ramesh ke site pe 700 rupaye kaam kiya', 'haan', 'Ramesh ne kitna dena hai?'],
  'kn-IN': ['ಇವತ್ತು Ramesh ಅವರ ಸೈಟ್‌ನಲ್ಲಿ ಏಳುನೂರು ರೂಪಾಯಿ ಕೆಲಸ ಮಾಡಿದೆ', 'ಹೌದು', 'Ramesh ಅವರು ನನಗೆ ಎಷ್ಟು ಕೊಡಬೇಕು?'],
};
