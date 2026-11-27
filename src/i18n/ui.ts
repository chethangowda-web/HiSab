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
  statementTitle: string;
  statementBtn: string;
  savePdf: string;
  shareSummary: string;
  back: string;
  confirmByEmployer: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  deleteAsk: string;
  demoModeLabel: string;
  demoBanner: string;
  demoNote: string;
  playSample: string;
  demoHelp: string;
  yourName: string;
  footerNote: string;
  invalidAmount: string;
  invalidDate: string;
  futureDate: string;
  amountLabel: string;
  dateLabel: string;
  colDate: string;
  colType: string;
  colAmount: string;
  colRecordedBy: string;
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
  statementTitle: 'Wage statement',
  statementBtn: 'Statement',
  savePdf: 'Save as PDF',
  shareSummary: 'Share summary',
  back: 'Back',
  confirmByEmployer: 'Employer confirms',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  deleteAsk: 'Delete this entry?',
  demoModeLabel: 'Demo mode',
  demoBanner: 'DEMO MODE',
  demoNote: 'Sample data, not real records.',
  playSample: 'Play sample',
  demoHelp: 'Shows sample data so you can try the app. Your real records are kept safe and hidden.',
  yourName: 'Your name',
  footerNote: 'Worker-recorded unless marked Employer-confirmed',
  invalidAmount: 'Enter an amount between 1 and 99,999.',
  invalidDate: 'Enter a valid date.',
  futureDate: 'The date cannot be in the future.',
  amountLabel: 'Amount',
  dateLabel: 'Date',
  colDate: 'Date',
  colType: 'Type',
  colAmount: 'Amount',
  colRecordedBy: 'Recorded by',
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
  statementTitle: 'मज़दूरी का स्टेटमेंट',
  statementBtn: 'स्टेटमेंट',
  savePdf: 'PDF के रूप में सेव करें',
  shareSummary: 'सारांश शेयर करें',
  back: 'वापस',
  confirmByEmployer: 'मालिक पुष्टि करे',
  edit: 'बदलें',
  delete: 'हटाएँ',
  save: 'सेव करें',
  cancel: 'रद्द करें',
  deleteAsk: 'यह एंट्री हटाएँ?',
  demoModeLabel: 'डेमो मोड',
  demoBanner: 'DEMO MODE',
  demoNote: 'नमूना डेटा, असली रिकॉर्ड नहीं।',
  playSample: 'नमूना चलाएँ',
  demoHelp: 'ऐप आज़माने के लिए नमूना डेटा दिखाता है। आपके असली रिकॉर्ड सुरक्षित रहते हैं, बस छिपे रहते हैं।',
  yourName: 'आपका नाम',
  footerNote: 'मज़दूर ने दर्ज किया, जब तक "मालिक ने पुष्टि की" न लिखा हो',
  invalidAmount: '1 से 99,999 के बीच रकम लिखें।',
  invalidDate: 'सही तारीख लिखें।',
  futureDate: 'तारीख आगे की नहीं हो सकती।',
  amountLabel: 'रकम',
  dateLabel: 'तारीख',
  colDate: 'तारीख',
  colType: 'प्रकार',
  colAmount: 'रकम',
  colRecordedBy: 'किसने दर्ज किया',
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
  statementTitle: 'ಕೂಲಿ ಹೇಳಿಕೆ',
  statementBtn: 'ಹೇಳಿಕೆ',
  savePdf: 'PDF ಆಗಿ ಉಳಿಸಿ',
  shareSummary: 'ಸಾರಾಂಶ ಹಂಚಿ',
  back: 'ಹಿಂದೆ',
  confirmByEmployer: 'ಮಾಲೀಕರು ಖಚಿತಪಡಿಸುತ್ತಾರೆ',
  edit: 'ಬದಲಿಸಿ',
  delete: 'ಅಳಿಸಿ',
  save: 'ಉಳಿಸಿ',
  cancel: 'ರದ್ದು',
  deleteAsk: 'ಈ ದಾಖಲೆಯನ್ನು ಅಳಿಸಬೇಕೇ?',
  demoModeLabel: 'ಡೆಮೋ ಮೋಡ್',
  demoBanner: 'DEMO MODE',
  demoNote: 'ಮಾದರಿ ಡೇಟಾ, ನಿಜವಾದ ದಾಖಲೆಗಳಲ್ಲ.',
  playSample: 'ಮಾದರಿ ಪ್ಲೇ ಮಾಡಿ',
  demoHelp: 'ಆಪ್ ಪ್ರಯತ್ನಿಸಲು ಮಾದರಿ ಡೇಟಾ ತೋರಿಸುತ್ತದೆ. ನಿಮ್ಮ ನಿಜವಾದ ದಾಖಲೆಗಳು ಸುರಕ್ಷಿತವಾಗಿವೆ, ಮರೆಯಾಗಿವೆ ಅಷ್ಟೇ.',
  yourName: 'ನಿಮ್ಮ ಹೆಸರು',
  footerNote: 'ಕೆಲಸಗಾರರು ದಾಖಲಿಸಿದ್ದು, "ಮಾಲೀಕರು ಖಚಿತಪಡಿಸಿದ್ದು" ಎಂದು ಗುರುತಿಸದ ಹೊರತು',
  invalidAmount: '1 ರಿಂದ 99,999 ರ ನಡುವೆ ಮೊತ್ತ ಬರೆಯಿರಿ.',
  invalidDate: 'ಸರಿಯಾದ ದಿನಾಂಕ ಬರೆಯಿರಿ.',
  futureDate: 'ದಿನಾಂಕ ಭವಿಷ್ಯದ್ದಾಗಿರಬಾರದು.',
  amountLabel: 'ಮೊತ್ತ',
  dateLabel: 'ದಿನಾಂಕ',
  colDate: 'ದಿನಾಂಕ',
  colType: 'ಬಗೆ',
  colAmount: 'ಮೊತ್ತ',
  colRecordedBy: 'ದಾಖಲಿಸಿದವರು',
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
