import type { Lang } from '../domain/types';
import { inr } from './ui';

/** Spoken/written text for v2 features: per-day amounts, multi-day saves and voice commands. */
export interface CommandMessages {
  askPerDay: string;
  savedDays(n: number): string;
  sayName: string;
  openingStatement(name: string): string;
  nothingToRemind(name: string): string;
  confirmRemind(name: string, amount: number): string;
  /** The WhatsApp message the worker sends to the employer. */
  reminderText(name: string, amount: number, workerName?: string): string;
  openingWhatsApp: string;
  nothingToUndo: string;
  confirmDelete(label: string): string;
  deleted: string;
  confirmRate(name: string, rate: number): string;
  rateSaved(name: string, rate: number): string;
  badRate: string;
}

const sign = (w?: string) => (w && w.trim() ? `\n— ${w.trim()}` : '');

const en: CommandMessages = {
  askPerDay: 'How many rupees per day?',
  savedDays: (n) => `Saved ${n} days.`,
  sayName: "Please say the employer's name too, like: Ramesh ka hisab dikhao.",
  openingStatement: (name) => `Opening ${name}'s statement.`,
  nothingToRemind: (name) => `${name} owes you nothing right now.`,
  confirmRemind: (name, a) => `${name} owes you ${a} rupees. Send this reminder?`,
  reminderText: (name, a, w) => `Hello ${name} ji 🙏\nMy pending wages: ${inr(a)}\nPlease pay soon.${sign(w)}\n(Sent from BoliHisab)`,
  openingWhatsApp: 'Opening WhatsApp.',
  nothingToUndo: 'There is no entry to delete.',
  confirmDelete: (label) => `Delete this entry: ${label}? Say yes or no.`,
  deleted: 'Deleted.',
  confirmRate: (name, r) => `Set ${name}'s daily rate to ${r} rupees? Say yes or no.`,
  rateSaved: (name, r) => `${name}'s daily rate is now ${r} rupees.`,
  badRate: 'Please say the rate in rupees, like: Ramesh ka rate 750 hai.',
};

const hi: CommandMessages = {
  askPerDay: 'रोज़ के कितने रुपये?',
  savedDays: (n) => `${n} दिन सेव हो गए।`,
  sayName: 'मालिक का नाम भी बोलिए, जैसे: रमेश का हिसाब दिखाओ।',
  openingStatement: (name) => `${name} का हिसाब खोल रहा हूँ।`,
  nothingToRemind: (name) => `${name} पर अभी कुछ बाकी नहीं है।`,
  confirmRemind: (name, a) => `${name} पर ${a} रुपये बाकी हैं। यह संदेश भेजूँ?`,
  reminderText: (name, a, w) => `नमस्ते ${name} जी 🙏\nमेरी बाकी मज़दूरी: ${inr(a)}\nकृपया जल्दी भुगतान करें।${sign(w)}\n(बोलीहिसाब से भेजा गया)`,
  openingWhatsApp: 'व्हाट्सऐप खोल रहा हूँ।',
  nothingToUndo: 'हटाने के लिए कोई एंट्री नहीं है।',
  confirmDelete: (label) => `यह एंट्री हटाऊँ: ${label}? हाँ या नहीं बोलिए।`,
  deleted: 'हटा दिया।',
  confirmRate: (name, r) => `${name} का रोज़ का रेट ${r} रुपये कर दूँ? हाँ या नहीं बोलिए।`,
  rateSaved: (name, r) => `${name} का रोज़ का रेट अब ${r} रुपये है।`,
  badRate: 'रेट रुपये में बोलिए, जैसे: रमेश का रेट 750 है।',
};

const kn: CommandMessages = {
  askPerDay: 'ದಿನಕ್ಕೆ ಎಷ್ಟು ರೂಪಾಯಿ?',
  savedDays: (n) => `${n} ದಿನ ಉಳಿಸಲಾಗಿದೆ.`,
  sayName: 'ಮಾಲೀಕರ ಹೆಸರನ್ನೂ ಹೇಳಿ, ಹೀಗೆ: ರಮೇಶ್ ಅವರ ಲೆಕ್ಕ ತೋರಿಸಿ.',
  openingStatement: (name) => `${name} ಅವರ ಲೆಕ್ಕ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`,
  nothingToRemind: (name) => `${name} ಅವರಿಂದ ಈಗ ಏನೂ ಬಾಕಿ ಇಲ್ಲ.`,
  confirmRemind: (name, a) => `${name} ಅವರಿಂದ ${a} ರೂಪಾಯಿ ಬಾಕಿ ಇದೆ. ಈ ಸಂದೇಶ ಕಳುಹಿಸಲೇ?`,
  reminderText: (name, a, w) => `ನಮಸ್ಕಾರ ${name} ಅವರೇ 🙏\nನನ್ನ ಬಾಕಿ ಕೂಲಿ: ${inr(a)}\nದಯವಿಟ್ಟು ಬೇಗ ಪಾವತಿಸಿ.${sign(w)}\n(ಬೋಲಿಹಿಸಾಬ್‌ನಿಂದ ಕಳುಹಿಸಲಾಗಿದೆ)`,
  openingWhatsApp: 'ವಾಟ್ಸಾಪ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
  nothingToUndo: 'ಅಳಿಸಲು ಯಾವುದೇ ದಾಖಲೆ ಇಲ್ಲ.',
  confirmDelete: (label) => `ಈ ದಾಖಲೆ ಅಳಿಸಲೇ: ${label}? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎನ್ನಿ.`,
  deleted: 'ಅಳಿಸಲಾಗಿದೆ.',
  confirmRate: (name, r) => `${name} ಅವರ ದಿನದ ರೇಟ್ ${r} ರೂಪಾಯಿ ಮಾಡಲೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎನ್ನಿ.`,
  rateSaved: (name, r) => `${name} ಅವರ ದಿನದ ರೇಟ್ ಈಗ ${r} ರೂಪಾಯಿ.`,
  badRate: 'ರೇಟ್ ಅನ್ನು ರೂಪಾಯಿಯಲ್ಲಿ ಹೇಳಿ, ಹೀಗೆ: ರಮೇಶ್ ಅವರ ರೇಟ್ 750.',
};

const ALL: Record<Lang, CommandMessages> = { 'en-IN': en, 'hi-IN': hi, 'kn-IN': kn };
export const commandMessages = (lang: Lang): CommandMessages => ALL[lang];
