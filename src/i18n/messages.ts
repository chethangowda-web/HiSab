import type { Draft, EntryType, Lang } from '../domain/types';
import type { QueryResult } from '../domain/queries';

export type Field = 'type' | 'employer' | 'amount';

export interface Messages {
  /** Spoken read-back of a draft; the user must confirm it before it is saved. */
  readBack(d: Draft, today: string): string;
  clarify(field: Field): string;
  which(names: string[]): string;
  repeat: string;
  fallbackHint: string;
  saved: string;
  discarded: string;
  notUnderstood: string;
  unclearAmount: string;
  answer(r: QueryResult, period?: 'month' | 'all'): string;
}

const MONTHS: Record<Lang, string[]> = {
  'en-IN': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  'hi-IN': ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  'kn-IN': ['ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್', 'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್'],
};
const TODAY: Record<Lang, string> = { 'en-IN': 'today', 'hi-IN': 'आज', 'kn-IN': 'ಇಂದು' };
const YESTERDAY: Record<Lang, string> = { 'en-IN': 'yesterday', 'hi-IN': 'कल', 'kn-IN': 'ನಿನ್ನೆ' };

const dayBefore = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

function datePhrase(lang: Lang, date: string | undefined, today: string): string {
  if (!date || date === today) return TODAY[lang];
  if (date === dayBefore(today)) return YESTERDAY[lang];
  const [, mm, dd] = date.split('-');
  return `${Number(dd)} ${MONTHS[lang][Number(mm) - 1]}`;
}

const TYPE: Record<Lang, Record<EntryType, string>> = {
  'en-IN': { work: 'work', overtime: 'overtime', advance: 'advance', payment: 'payment' },
  'hi-IN': { work: 'काम', overtime: 'ओवरटाइम', advance: 'एडवांस', payment: 'भुगतान' },
  'kn-IN': { work: 'ಕೆಲಸ', overtime: 'ಓವರ್‌ಟೈಮ್', advance: 'ಮುಂಗಡ', payment: 'ಪಾವತಿ' },
};
const HOURS: Record<Lang, (h: number) => string> = {
  'en-IN': (h) => ` ${h} hours`,
  'hi-IN': (h) => ` ${h} घंटे`,
  'kn-IN': (h) => ` ${h} ಗಂಟೆ`,
};

const readBackFor = (lang: Lang, tail: string, rupees: string) => (d: Draft, today: string) => {
  const type = d.type ? TYPE[lang][d.type] : '';
  const hours = d.hours !== undefined ? HOURS[lang](d.hours) : '';
  return `${d.employerName ?? ''}. ${type}${hours}. ${d.amount} ${rupees}. ${datePhrase(lang, d.date, today)}. ${tail}`;
};

const en: Messages = {
  readBack: readBackFor('en-IN', 'Shall I save it? Say yes or no.', 'rupees'),
  clarify: (f) =>
    ({
      type: 'Was it work, an advance, or a payment?',
      employer: 'Which employer?',
      amount: 'How many rupees?',
    })[f],
  which: (names) => `Which one: ${names.join(' or ')}?`,
  repeat: "Sorry, I didn't catch that. Please say it again.",
  fallbackHint: "I'm having trouble hearing you. Please type it instead.",
  saved: 'Saved.',
  discarded: 'Okay, cancelled. Please say the entry again.',
  notUnderstood: "Sorry, I didn't understand. Try: I worked at Ramesh for 700 rupees.",
  unclearAmount: "I couldn't catch the amount. How many rupees?",
  answer: (r, period) => {
    const emp = r.employerName;
    switch (r.key) {
      case 'owed': {
        const a = r.amount ?? 0;
        if (a === 0) return 'Nothing is pending.';
        if (a < 0) return `You have taken ${-a} rupees more than you earned${emp ? ` from ${emp}` : ''}.`;
        return emp ? `${emp} owes you ${a} rupees.` : `In total you are owed ${a} rupees.`;
      }
      case 'earned':
        return `You earned ${r.amount} rupees${period === 'month' ? ' this month' : ''}${emp ? ` from ${emp}` : ''}.`;
      case 'advances':
        return `You have taken ${r.amount} rupees as advance${emp ? ` from ${emp}` : ''}.`;
      case 'days':
        return `You worked ${r.amount} days${emp ? ` for ${emp}` : ''}.`;
      case 'unknown_employer':
        return `I don't know an employer called ${emp}.`;
      case 'ambiguous_employer':
        return `More than one employer is called ${emp}. Please say the full name.`;
    }
  },
};

const hi: Messages = {
  readBack: readBackFor('hi-IN', 'सेव कर दूँ? हाँ या नहीं बोलिए।', 'रुपये'),
  clarify: (f) =>
    ({
      type: 'यह काम था, एडवांस था या भुगतान?',
      employer: 'कौन सा मालिक?',
      amount: 'कितने रुपये?',
    })[f],
  which: (names) => `कौन सा: ${names.join(' या ')}?`,
  repeat: 'माफ़ कीजिए, मैं समझ नहीं पाया। कृपया फिर से बोलिए।',
  fallbackHint: 'मुझे सुनने में दिक्कत हो रही है। कृपया टाइप करें।',
  saved: 'सेव हो गया।',
  discarded: 'ठीक है, रद्द किया। कृपया फिर से बताइए।',
  notUnderstood: 'समझ नहीं आया। ऐसे बोलिए: मैंने रमेश के यहाँ 700 रुपये काम किया।',
  unclearAmount: 'रकम समझ नहीं आई। कितने रुपये?',
  answer: (r, period) => {
    const emp = r.employerName;
    switch (r.key) {
      case 'owed': {
        const a = r.amount ?? 0;
        if (a === 0) return 'कुछ बाकी नहीं है।';
        if (a < 0) return `आपने ${emp ? `${emp} से ` : ''}कमाई से ${-a} रुपये ज़्यादा लिए हैं।`;
        return emp ? `${emp} को आपको ${a} रुपये देने हैं।` : `कुल मिलाकर आपके ${a} रुपये बाकी हैं।`;
      }
      case 'earned':
        return `${period === 'month' ? 'इस महीने ' : ''}${emp ? `${emp} से ` : ''}आपने ${r.amount} रुपये कमाए।`;
      case 'advances':
        return `${emp ? `${emp} से ` : ''}आपने ${r.amount} रुपये एडवांस लिया है।`;
      case 'days':
        return `${emp ? `${emp} के यहाँ ` : ''}आपने ${r.amount} दिन काम किया।`;
      case 'unknown_employer':
        return `${emp} नाम का कोई मालिक मुझे नहीं पता।`;
      case 'ambiguous_employer':
        return `${emp} नाम के एक से ज़्यादा मालिक हैं। कृपया पूरा नाम बोलिए।`;
    }
  },
};

const kn: Messages = {
  readBack: readBackFor('kn-IN', 'ಉಳಿಸಲೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎನ್ನಿ.', 'ರೂಪಾಯಿ'),
  clarify: (f) =>
    ({
      type: 'ಇದು ಕೆಲಸವೇ, ಮುಂಗಡವೇ ಅಥವಾ ಪಾವತಿಯೇ?',
      employer: 'ಯಾವ ಮಾಲೀಕರು?',
      amount: 'ಎಷ್ಟು ರೂಪಾಯಿ?',
    })[f],
  which: (names) => `ಯಾರು: ${names.join(' ಅಥವಾ ')}?`,
  repeat: 'ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.',
  fallbackHint: 'ನನಗೆ ಕೇಳಿಸುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಟೈಪ್ ಮಾಡಿ.',
  saved: 'ಉಳಿಸಲಾಗಿದೆ.',
  discarded: 'ಸರಿ, ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.',
  notUnderstood: 'ಅರ್ಥವಾಗಲಿಲ್ಲ. ಹೀಗೆ ಹೇಳಿ: ನಾನು ರಮೇಶ್ ಅವರ ಬಳಿ 700 ರೂಪಾಯಿ ಕೆಲಸ ಮಾಡಿದೆ.',
  unclearAmount: 'ಮೊತ್ತ ಅರ್ಥವಾಗಲಿಲ್ಲ. ಎಷ್ಟು ರೂಪಾಯಿ?',
  answer: (r, period) => {
    const emp = r.employerName;
    switch (r.key) {
      case 'owed': {
        const a = r.amount ?? 0;
        if (a === 0) return 'ಏನೂ ಬಾಕಿ ಇಲ್ಲ.';
        if (a < 0) return `ನೀವು ${emp ? `${emp} ಅವರಿಂದ ` : ''}ಗಳಿಕೆಗಿಂತ ${-a} ರೂಪಾಯಿ ಹೆಚ್ಚು ತೆಗೆದುಕೊಂಡಿದ್ದೀರಿ.`;
        return emp ? `${emp} ಅವರು ನಿಮಗೆ ${a} ರೂಪಾಯಿ ಕೊಡಬೇಕು.` : `ಒಟ್ಟು ನಿಮಗೆ ${a} ರೂಪಾಯಿ ಬಾಕಿ ಇದೆ.`;
      }
      case 'earned':
        return `${period === 'month' ? 'ಈ ತಿಂಗಳು ' : ''}${emp ? `${emp} ಅವರಿಂದ ` : ''}ನೀವು ${r.amount} ರೂಪಾಯಿ ಗಳಿಸಿದ್ದೀರಿ.`;
      case 'advances':
        return `${emp ? `${emp} ಅವರಿಂದ ` : ''}ನೀವು ${r.amount} ರೂಪಾಯಿ ಮುಂಗಡ ತೆಗೆದುಕೊಂಡಿದ್ದೀರಿ.`;
      case 'days':
        return `${emp ? `${emp} ಅವರ ಬಳಿ ` : ''}ನೀವು ${r.amount} ದಿನ ಕೆಲಸ ಮಾಡಿದ್ದೀರಿ.`;
      case 'unknown_employer':
        return `${emp} ಎಂಬ ಮಾಲೀಕರು ನನಗೆ ತಿಳಿದಿಲ್ಲ.`;
      case 'ambiguous_employer':
        return `${emp} ಎಂಬ ಹೆಸರಿನ ಒಂದಕ್ಕಿಂತ ಹೆಚ್ಚು ಮಾಲೀಕರಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ಪೂರ್ಣ ಹೆಸರು ಹೇಳಿ.`;
    }
  },
};

const ALL: Record<Lang, Messages> = { 'en-IN': en, 'hi-IN': hi, 'kn-IN': kn };

export const messages = (lang: Lang): Messages => ALL[lang];
