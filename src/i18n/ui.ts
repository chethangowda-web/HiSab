import type { Lang } from '../domain/types';

export interface UiText {
  appTagline: string;
  navHome: string;
  navLedger: string;
  navEmployers: string;
  navPayments: string;
  navSettings: string;
  owedToYou: string;
  earnedThisMonth: string;
  tapToSpeak: string;
  listening: string;
  typeHere: string;
  send: string;
  yes: string;
  no: string;
  typeBanner: string;
  micDenied: string;
  tryOneLine: string;
  workerRecorded: string;
  employerConfirmed: string;
  noEntries: string;
  noEmployers: string;
  noPayments: string;
  daysWorked: string;
  earned: string;
  advances: string;
  payments: string;
  outstanding: string;
  total: string;
  language: string;
  languageHelp: string;
}

const en: UiText = {
  appTagline: 'Speak your work. We keep the hisab.',
  navHome: 'Home',
  navLedger: 'Ledger',
  navEmployers: 'Employers',
  navPayments: 'Payments',
  navSettings: 'Settings',
  owedToYou: 'Still owed to you',
  earnedThisMonth: 'Earned this month',
  tapToSpeak: 'Tap to speak',
  listening: 'Listening…',
  typeHere: 'Type here',
  send: 'Send',
  yes: 'Yes',
  no: 'No',
  typeBanner: "Voice isn't available here. Please type instead.",
  micDenied: 'Microphone is blocked. Please allow it, or type instead.',
  tryOneLine: 'Tap the mic and say: "I worked at Ramesh for 700 rupees today"',
  workerRecorded: 'Worker-recorded',
  employerConfirmed: 'Employer-confirmed',
  noEntries: 'No entries yet.',
  noEmployers: 'No employers yet.',
  noPayments: 'No advances or payments yet.',
  daysWorked: 'Days worked',
  earned: 'Earned',
  advances: 'Advances',
  payments: 'Payments',
  outstanding: 'Outstanding',
  total: 'Total',
  language: 'Language',
  languageHelp: 'The app will speak and show text in this language.',
};

const hi: UiText = {
  appTagline: 'बोलिए अपना काम। हिसाब हम रखेंगे।',
  navHome: 'होम',
  navLedger: 'खाता',
  navEmployers: 'मालिक',
  navPayments: 'भुगतान',
  navSettings: 'सेटिंग्स',
  owedToYou: 'आपका बाकी पैसा',
  earnedThisMonth: 'इस महीने की कमाई',
  tapToSpeak: 'बोलने के लिए दबाएँ',
  listening: 'सुन रहा हूँ…',
  typeHere: 'यहाँ लिखें',
  send: 'भेजें',
  yes: 'हाँ',
  no: 'नहीं',
  typeBanner: 'यहाँ आवाज़ काम नहीं कर रही। कृपया टाइप करें।',
  micDenied: 'माइक्रोफ़ोन बंद है। कृपया अनुमति दें, या टाइप करें।',
  tryOneLine: 'माइक दबाकर बोलिए: "आज रमेश के यहाँ 700 रुपये काम किया"',
  workerRecorded: 'मज़दूर ने दर्ज किया',
  employerConfirmed: 'मालिक ने पुष्टि की',
  noEntries: 'अभी कोई एंट्री नहीं।',
  noEmployers: 'अभी कोई मालिक नहीं।',
  noPayments: 'अभी कोई एडवांस या भुगतान नहीं।',
  daysWorked: 'काम के दिन',
  earned: 'कमाई',
  advances: 'एडवांस',
  payments: 'भुगतान',
  outstanding: 'बाकी',
  total: 'कुल',
  language: 'भाषा',
  languageHelp: 'ऐप इसी भाषा में बोलेगा और दिखाएगा।',
};

const kn: UiText = {
  appTagline: 'ನಿಮ್ಮ ಕೆಲಸ ಹೇಳಿ. ಲೆಕ್ಕ ನಾವು ಇಡುತ್ತೇವೆ.',
  navHome: 'ಮುಖಪುಟ',
  navLedger: 'ಲೆಕ್ಕ',
  navEmployers: 'ಮಾಲೀಕರು',
  navPayments: 'ಪಾವತಿ',
  navSettings: 'ಸೆಟ್ಟಿಂಗ್ಸ್',
  owedToYou: 'ನಿಮಗೆ ಬರಬೇಕಾದ ಹಣ',
  earnedThisMonth: 'ಈ ತಿಂಗಳ ಗಳಿಕೆ',
  tapToSpeak: 'ಮಾತನಾಡಲು ಒತ್ತಿ',
  listening: 'ಕೇಳುತ್ತಿದ್ದೇನೆ…',
  typeHere: 'ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ',
  send: 'ಕಳುಹಿಸಿ',
  yes: 'ಹೌದು',
  no: 'ಇಲ್ಲ',
  typeBanner: 'ಇಲ್ಲಿ ಧ್ವನಿ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಟೈಪ್ ಮಾಡಿ.',
  micDenied: 'ಮೈಕ್ರೋಫೋನ್ ಬ್ಲಾಕ್ ಆಗಿದೆ. ಅನುಮತಿ ನೀಡಿ, ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.',
  tryOneLine: 'ಮೈಕ್ ಒತ್ತಿ ಹೇಳಿ: "ಇಂದು ರಮೇಶ್ ಅವರ ಬಳಿ 700 ರೂಪಾಯಿ ಕೆಲಸ ಮಾಡಿದೆ"',
  workerRecorded: 'ಕೆಲಸಗಾರರು ದಾಖಲಿಸಿದ್ದು',
  employerConfirmed: 'ಮಾಲೀಕರು ಖಚಿತಪಡಿಸಿದ್ದು',
  noEntries: 'ಇನ್ನೂ ಯಾವುದೇ ದಾಖಲೆ ಇಲ್ಲ.',
  noEmployers: 'ಇನ್ನೂ ಮಾಲೀಕರಿಲ್ಲ.',
  noPayments: 'ಇನ್ನೂ ಮುಂಗಡ ಅಥವಾ ಪಾವತಿ ಇಲ್ಲ.',
  daysWorked: 'ಕೆಲಸದ ದಿನಗಳು',
  earned: 'ಗಳಿಕೆ',
  advances: 'ಮುಂಗಡ',
  payments: 'ಪಾವತಿ',
  outstanding: 'ಬಾಕಿ',
  total: 'ಒಟ್ಟು',
  language: 'ಭಾಷೆ',
  languageHelp: 'ಆಪ್ ಈ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡುತ್ತದೆ ಮತ್ತು ತೋರಿಸುತ್ತದೆ.',
};

const ALL: Record<Lang, UiText> = { 'en-IN': en, 'hi-IN': hi, 'kn-IN': kn };

export const uiText = (lang: Lang): UiText => ALL[lang];

export const LANGUAGES: { lang: Lang; label: string }[] = [
  { lang: 'kn-IN', label: 'ಕನ್ನಡ' },
  { lang: 'hi-IN', label: 'हिन्दी' },
  { lang: 'en-IN', label: 'English' },
];

export const isLang = (v: unknown): v is Lang => v === 'en-IN' || v === 'hi-IN' || v === 'kn-IN';

/** Rupees with Indian digit grouping, e.g. ₹1,10,000. Negative amounts show a leading minus. */
export function inr(n: number): string {
  return `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN')}`;
}
