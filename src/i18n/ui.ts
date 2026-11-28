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
  yourName: string;
  yourPhone: string;
  employerPhone: string;
  callBtn: string;
  callNeedNumbers: string;
  callBadNumber: string;
  callCalling: string;
  callFailed: string;
  callTooMany: string;
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
  edgeLabel: string;
  edgeHelp: string;
  edgeChecking: string;
  edgeOk: string;
  edgeDown: string;
  thinking: string;
  youSaid: string;
  savedShort: string;
  undo: string;
  examplesTitle: string;
  moreActions: string;
  welcomeTitle: string;
  welcomeText: string;
  byEmployer: string;
  loading: string;
  hoursUnit: string;
  statementFor: string;
  /** "{name}" is replaced with the employer's name. */
  usualRateOf: string;
  sendWhatsApp: string;
  whatsappPreview: string;
  openWhatsApp: string;
  rateTitle: string;
  perDayUnit: string;
  ratesHelp: string;
  dailyRateAria: string;
  commandsTitle: string;
  done: string;
  speakNow: string;
  understanding: string;
  voiceByWispr: string;
  voiceProof: string;
  playProof: string;
  stopProof: string;
  keepProofTitle: string;
  keepProofHelp: string;
  voiceEngineTitle: string;
  useWisprLabel: string;
  wisprOk: string;
  wisprMissing: string;
  wisprFallback: string;
  browserSpeech: string;
  edgeSarvamOk: string;
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
  yourName: 'Your name',
  yourPhone: 'Your phone number',
  employerPhone: 'Employer phone number',
  callBtn: 'Call',
  callNeedNumbers: 'Add your phone number in Settings and the employer\u2019s number here to call.',
  callBadNumber: 'Enter a 10-digit Indian mobile number.',
  callCalling: 'Calling your phone\u2026 pick up and you\u2019ll be connected.',
  callFailed: 'Could not start the call. Please try again.',
  callTooMany: 'Too many calls. Please try again later.',
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
  edgeLabel: 'Smart helper (local AI)',
  edgeHelp: 'Uses a small AI model on your own computer to understand tricky sentences. Optional: everything works without it.',
  edgeChecking: 'Checking…',
  edgeOk: 'Connected to the local model.',
  edgeDown: 'Not connected. The app still works without it. To start it, run: npm run edge',
  thinking: 'Thinking…',
  youSaid: 'You said',
  savedShort: 'Saved',
  undo: 'Undo',
  examplesTitle: 'You can say',
  moreActions: 'Options',
  welcomeTitle: 'Welcome!',
  welcomeText: 'Say what work you did or what you were paid. BoliHisab keeps your hisab, so nobody can forget or dispute it.',
  byEmployer: 'By employer',
  loading: 'Loading…',
  hoursUnit: 'h',
  statementFor: 'Statement for',
  usualRateOf: '{name}’s usual rate',
  sendWhatsApp: 'Send on WhatsApp',
  whatsappPreview: 'WhatsApp preview',
  openWhatsApp: 'Open WhatsApp',
  rateTitle: 'Usual daily rate',
  perDayUnit: '/ day',
  ratesHelp: 'Learned from what you said. Change it here, or say “Ramesh ka rate 750 hai”.',
  dailyRateAria: 'daily rate',
  commandsTitle: 'Also by voice',
  done: 'Done',
  speakNow: 'Speak now…',
  understanding: 'Understanding…',
  voiceByWispr: 'Voice by Wispr Flow',
  voiceProof: 'Voice proof',
  playProof: 'Play voice proof',
  stopProof: 'Stop',
  keepProofTitle: 'Keep voice proof',
  keepProofHelp: 'Save a short clip of your own voice with every spoken entry, on this phone only. If there is ever a dispute, play it back.',
  voiceEngineTitle: 'Voice engine',
  useWisprLabel: 'Use Wispr Flow',
  wisprOk: 'Wispr Flow is connected: strong on Hinglish and Indian accents.',
  wisprMissing: 'Wispr Flow is not set up on this server, so the phone’s own speech recognition is used.',
  wisprFallback: 'Wispr Flow did not answer. Please say it again.',
  browserSpeech: 'Phone speech recognition',
  edgeSarvamOk: 'Connected to Sarvam 105B.',
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
  yourName: 'आपका नाम',
  yourPhone: 'आपका फ़ोन नंबर',
  employerPhone: 'मालिक का फ़ोन नंबर',
  callBtn: 'कॉल करें',
  callNeedNumbers: 'कॉल के लिए सेटिंग्स में अपना नंबर और यहाँ मालिक का नंबर डालें।',
  callBadNumber: '10 अंकों का भारतीय मोबाइल नंबर डालें।',
  callCalling: 'आपके फ़ोन पर कॉल आ रही है… उठाइए, आप जुड़ जाएँगे।',
  callFailed: 'कॉल शुरू नहीं हो सकी। फिर से कोशिश करें।',
  callTooMany: 'बहुत ज़्यादा कॉल। थोड़ी देर बाद कोशिश करें।',
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
  edgeLabel: 'स्मार्ट सहायक (लोकल AI)',
  edgeHelp: 'मुश्किल वाक्य समझने के लिए आपके अपने कंप्यूटर पर एक छोटा AI मॉडल इस्तेमाल करता है। वैकल्पिक: इसके बिना भी सब चलता है।',
  edgeChecking: 'जाँच रहा हूँ…',
  edgeOk: 'लोकल मॉडल से जुड़ गया।',
  edgeDown: 'जुड़ा नहीं है। इसके बिना भी ऐप चलता है। शुरू करने के लिए चलाएँ: npm run edge',
  thinking: 'सोच रहा हूँ…',
  youSaid: 'आपने कहा',
  savedShort: 'सेव हुआ',
  undo: 'वापस लें',
  examplesTitle: 'आप ऐसे बोल सकते हैं',
  moreActions: 'विकल्प',
  welcomeTitle: 'स्वागत है!',
  welcomeText: 'बोलकर बताइए कि आपने क्या काम किया या कितने पैसे मिले। बोलीहिसाब आपका हिसाब रखता है, ताकि कोई भूल या झगड़ा न हो।',
  byEmployer: 'मालिक के हिसाब से',
  loading: 'लोड हो रहा है…',
  hoursUnit: 'घं',
  statementFor: 'स्टेटमेंट',
  usualRateOf: '{name} का रोज़ का रेट',
  sendWhatsApp: 'व्हाट्सऐप पर भेजें',
  whatsappPreview: 'व्हाट्सऐप संदेश',
  openWhatsApp: 'व्हाट्सऐप खोलें',
  rateTitle: 'रोज़ का रेट',
  perDayUnit: '/ दिन',
  ratesHelp: 'आपकी बातों से सीखा गया। यहाँ बदलें, या बोलें “रमेश का रेट 750 है”।',
  dailyRateAria: 'रोज़ का रेट',
  commandsTitle: 'बोलकर यह भी करें',
  done: 'हो गया',
  speakNow: 'अब बोलिए…',
  understanding: 'समझ रहा हूँ…',
  voiceByWispr: 'Voice by Wispr Flow',
  voiceProof: 'आवाज़ का सबूत',
  playProof: 'आवाज़ सुनें',
  stopProof: 'रोकें',
  keepProofTitle: 'आवाज़ का सबूत रखें',
  keepProofHelp: 'हर बोली गई एंट्री के साथ आपकी आवाज़ की छोटी क्लिप इसी फ़ोन पर रखी जाती है। कभी झगड़ा हो तो उसे चलाकर सुनाइए।',
  voiceEngineTitle: 'आवाज़ पहचान',
  useWisprLabel: 'Wispr Flow इस्तेमाल करें',
  wisprOk: 'Wispr Flow जुड़ा है: हिंग्लिश और भारतीय लहजे में मज़बूत।',
  wisprMissing: 'इस सर्वर पर Wispr Flow सेट नहीं है, इसलिए फ़ोन की अपनी आवाज़ पहचान इस्तेमाल हो रही है।',
  wisprFallback: 'Wispr Flow से जवाब नहीं आया। कृपया फिर से बोलिए।',
  browserSpeech: 'फ़ोन की आवाज़ पहचान',
  edgeSarvamOk: 'Sarvam 105B से जुड़ा है।',
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
  yourName: 'ನಿಮ್ಮ ಹೆಸರು',
  yourPhone: 'ನಿಮ್ಮ ಫೋನ್ ನಂಬರ್',
  employerPhone: 'ಮಾಲೀಕರ ಫೋನ್ ನಂಬರ್',
  callBtn: 'ಕರೆ ಮಾಡಿ',
  callNeedNumbers: 'ಕರೆ ಮಾಡಲು ಸೆಟ್ಟಿಂಗ್ಸ್‌ನಲ್ಲಿ ನಿಮ್ಮ ನಂಬರ್ ಮತ್ತು ಇಲ್ಲಿ ಮಾಲೀಕರ ನಂಬರ್ ಹಾಕಿ.',
  callBadNumber: '10 ಅಂಕಿಗಳ ಭಾರತೀಯ ಮೊಬೈಲ್ ನಂಬರ್ ಹಾಕಿ.',
  callCalling: 'ನಿಮ್ಮ ಫೋನ್‌ಗೆ ಕರೆ ಬರುತ್ತಿದೆ… ಎತ್ತಿ, ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಲಾಗುತ್ತದೆ.',
  callFailed: 'ಕರೆ ಪ್ರಾರಂಭಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  callTooMany: 'ತುಂಬಾ ಕರೆಗಳು. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.',
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
  edgeLabel: 'ಸ್ಮಾರ್ಟ್ ಸಹಾಯಕ (ಲೋಕಲ್ AI)',
  edgeHelp: 'ಕಷ್ಟದ ವಾಕ್ಯಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ನಿಮ್ಮದೇ ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಸಣ್ಣ AI ಮಾದರಿ ಬಳಸುತ್ತದೆ. ಐಚ್ಛಿಕ: ಇಲ್ಲದಿದ್ದರೂ ಎಲ್ಲವೂ ಕೆಲಸ ಮಾಡುತ್ತದೆ.',
  edgeChecking: 'ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ…',
  edgeOk: 'ಲೋಕಲ್ ಮಾದರಿಗೆ ಸಂಪರ್ಕವಾಗಿದೆ.',
  edgeDown: 'ಸಂಪರ್ಕವಾಗಿಲ್ಲ. ಇಲ್ಲದಿದ್ದರೂ ಆಪ್ ಕೆಲಸ ಮಾಡುತ್ತದೆ. ಪ್ರಾರಂಭಿಸಲು ಚಲಾಯಿಸಿ: npm run edge',
  thinking: 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ…',
  youSaid: 'ನೀವು ಹೇಳಿದ್ದು',
  savedShort: 'ಉಳಿಸಲಾಗಿದೆ',
  undo: 'ಹಿಂದಕ್ಕೆ',
  examplesTitle: 'ನೀವು ಹೀಗೆ ಹೇಳಬಹುದು',
  moreActions: 'ಆಯ್ಕೆಗಳು',
  welcomeTitle: 'ಸ್ವಾಗತ!',
  welcomeText: 'ನೀವು ಮಾಡಿದ ಕೆಲಸ ಅಥವಾ ಸಿಕ್ಕ ಹಣವನ್ನು ಹೇಳಿ. ಬೋಲಿಹಿಸಾಬ್ ನಿಮ್ಮ ಲೆಕ್ಕ ಇಡುತ್ತದೆ, ಯಾರೂ ಮರೆಯುವುದಿಲ್ಲ, ವಾದ ಮಾಡುವುದಿಲ್ಲ.',
  byEmployer: 'ಮಾಲೀಕರ ಪ್ರಕಾರ',
  loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
  hoursUnit: 'ಗಂ',
  statementFor: 'ಹೇಳಿಕೆ',
  usualRateOf: '{name} ಅವರ ದಿನದ ರೇಟ್',
  sendWhatsApp: 'ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಕಳುಹಿಸಿ',
  whatsappPreview: 'ವಾಟ್ಸಾಪ್ ಸಂದೇಶ',
  openWhatsApp: 'ವಾಟ್ಸಾಪ್ ತೆರೆಯಿರಿ',
  rateTitle: 'ದಿನದ ರೇಟ್',
  perDayUnit: '/ ದಿನ',
  ratesHelp: 'ನೀವು ಹೇಳಿದ್ದರಿಂದ ಕಲಿತದ್ದು. ಇಲ್ಲಿ ಬದಲಿಸಿ, ಅಥವಾ ಹೇಳಿ “ರಮೇಶ್ ಅವರ ರೇಟ್ 750”.',
  dailyRateAria: 'ದಿನದ ರೇಟ್',
  commandsTitle: 'ಧ್ವನಿಯಿಂದ ಇದನ್ನೂ ಮಾಡಿ',
  done: 'ಮುಗಿಯಿತು',
  speakNow: 'ಈಗ ಮಾತನಾಡಿ…',
  understanding: 'ಅರ್ಥ ಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ…',
  voiceByWispr: 'Voice by Wispr Flow',
  voiceProof: 'ಧ್ವನಿ ಸಾಕ್ಷಿ',
  playProof: 'ಧ್ವನಿ ಕೇಳಿ',
  stopProof: 'ನಿಲ್ಲಿಸಿ',
  keepProofTitle: 'ಧ್ವನಿ ಸಾಕ್ಷಿ ಇಡಿ',
  keepProofHelp: 'ನೀವು ಹೇಳುವ ಪ್ರತಿ ದಾಖಲೆಯ ಜೊತೆ ನಿಮ್ಮ ಧ್ವನಿಯ ಸಣ್ಣ ಕ್ಲಿಪ್ ಈ ಫೋನ್‌ನಲ್ಲೇ ಉಳಿಯುತ್ತದೆ. ವಾದ ಬಂದರೆ ಅದನ್ನು ಕೇಳಿಸಿ.',
  voiceEngineTitle: 'ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ',
  useWisprLabel: 'Wispr Flow ಬಳಸಿ',
  wisprOk: 'Wispr Flow ಸಂಪರ್ಕವಾಗಿದೆ: ಹಿಂಗ್ಲಿಷ್ ಮತ್ತು ಭಾರತೀಯ ಉಚ್ಚಾರಣೆಯಲ್ಲಿ ಉತ್ತಮ.',
  wisprMissing: 'ಈ ಸರ್ವರ್‌ನಲ್ಲಿ Wispr Flow ಹೊಂದಿಸಿಲ್ಲ, ಆದ್ದರಿಂದ ಫೋನ್‌ನ ಸ್ವಂತ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಬಳಸಲಾಗುತ್ತಿದೆ.',
  wisprFallback: 'Wispr Flow ಉತ್ತರಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.',
  browserSpeech: 'ಫೋನ್‌ನ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ',
  edgeSarvamOk: 'Sarvam 105B ಗೆ ಸಂಪರ್ಕವಾಗಿದೆ.',
};

const ALL: Record<Lang, UiText> = { 'en-IN': en, 'hi-IN': hi, 'kn-IN': kn };

export const uiText = (lang: Lang): UiText => ALL[lang];

export const LANGUAGES: { lang: Lang; label: string }[] = [
  { lang: 'kn-IN', label: 'ಕನ್ನಡ' },
  { lang: 'hi-IN', label: 'हिन्दी' },
  { lang: 'en-IN', label: 'English' },
];

export const isLang = (v: unknown): v is Lang => v === 'en-IN' || v === 'hi-IN' || v === 'kn-IN';

/** First-launch language: the phone's language if we support it, otherwise English. */
export function detectLanguage(browserLanguage: string | undefined = typeof navigator === 'undefined' ? undefined : navigator.language): Lang {
  const base = (browserLanguage ?? '').toLowerCase().split('-')[0];
  return base === 'kn' ? 'kn-IN' : base === 'hi' ? 'hi-IN' : 'en-IN';
}

/** Rupees with Indian digit grouping, e.g. ₹1,10,000. Negative amounts show a leading minus. */
export function inr(n: number): string {
  return `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN')}`;
}
