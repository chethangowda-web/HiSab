const nfc = (s: string) => s.normalize('NFC');

function build(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries).map(([k, v]) => [nfc(k), v]));
}

/** Additive number words (units, teens, tens, Kannada "hundreds" words). */
export const UNITS = build({
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
  // Hindi (romanized). "do" (2) is handled specially in the scanner: it is also an English word.
  ek: 1, teen: 3, char: 4, paanch: 5, panch: 5, paach: 5, chhe: 6, chhah: 6, cheh: 6, saat: 7,
  aath: 8, nau: 9, das: 10, gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15,
  solah: 16, satrah: 17, atharah: 18, unnis: 19, bees: 20, tees: 30, chalis: 40, pachaas: 50,
  pachas: 50, sattar: 70, assi: 80, nabbe: 90,
  // Hindi (Devanagari)
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, छः: 6, छे: 6, सात: 7, आठ: 8, नौ: 9,
  दस: 10, बीस: 20, तीस: 30, चालीस: 40, पचास: 50, सत्तर: 70, अस्सी: 80, नब्बे: 90,
  // Kannada (script)
  ಒಂದು: 1, ಎರಡು: 2, ಮೂರು: 3, ನಾಲ್ಕು: 4, ಐದು: 5, ಆರು: 6, ಏಳು: 7, ಎಂಟು: 8, ಒಂಬತ್ತು: 9,
  ಹತ್ತು: 10, ಇಪ್ಪತ್ತು: 20, ಮೂವತ್ತು: 30, ನಲವತ್ತು: 40, ಐವತ್ತು: 50, ಅರವತ್ತು: 60,
  ಎಪ್ಪತ್ತು: 70, ಎಂಬತ್ತು: 80, ತೊಂಬತ್ತು: 90,
  ಇನ್ನೂರು: 200, ಮುನ್ನೂರು: 300, ನಾನೂರು: 400, ಐನೂರು: 500, ಒಂಬೈನೂರು: 900,
  // Kannada (romanized)
  ondu: 1, eradu: 2, mooru: 3, nalku: 4, naalku: 4, aidu: 5, aaru: 6, elu: 7, entu: 8,
  ombattu: 9, hattu: 10, ippattu: 20, muvattu: 30, nalavattu: 40, aivattu: 50,
  innooru: 200, munnooru: 300, naanooru: 400, ainooru: 500,
});

/** Multiplier words. */
export const MULTS = build({
  hundred: 100, thousand: 1000, lakh: 100000,
  sau: 100, hazaar: 1000, hazar: 1000, hajar: 1000,
  सौ: 100, हज़ार: 1000, हजार: 1000, लाख: 100000,
  ನೂರು: 100, ಸಾವಿರ: 1000, ಲಕ್ಷ: 100000,
  nooru: 100, saavira: 1000, savira: 1000,
});

export const HOUR_WORDS = new Set(
  ['hour', 'hours', 'hr', 'hrs', 'ghante', 'ghanta', 'ghantey', 'ghanton', 'ghantay', 'घंटे', 'घंटा', 'घण्टे', 'ಗಂಟೆ', 'ಗಂಟೆಗಳು', 'ಗಂಟೆಯ', 'gante', 'ganteyalli'].map(nfc),
);
export const DAY_WORDS = new Set(
  ['day', 'days', 'din', 'दिन', 'ದಿನ', 'ದಿನಗಳು', 'ದಿನದ', 'dina'].map(nfc),
);
/** Words that may sit between a number and "hours" ("two extra hours"). */
export const FILLERS = new Set(['extra', 'more', 'additional', 'ekstra', 'aur', 'और', 'ಹೆಚ್ಚುವರಿ', 'अतिरिक्त'].map(nfc));

export const TODAY_WORDS = new Set(['today', 'aaj', 'aj', 'आज', 'ಇಂದು', 'ಇವತ್ತು', 'ivattu', 'indu', 'avattu'].map(nfc));
export const YESTERDAY_WORDS = new Set(['yesterday', 'kal', 'कल', 'ನಿನ್ನೆ', 'ninne'].map(nfc));
export const DAY_BEFORE_WORDS = new Set(['parso', 'parson', 'parsoon', 'परसों', 'परसो', 'ಮೊನ್ನೆ', 'monne'].map(nfc));

export const YES_WORDS = new Set(
  ['yes', 'yeah', 'yep', 'yup', 'ok', 'okay', 'sure', 'correct', 'right', 'confirm', 'haan', 'haa', 'han', 'hanji', 'ji', 'theek', 'thik', 'sahi', 'सही', 'हाँ', 'हां', 'हा', 'जी', 'ठीक', 'ಹೌದು', 'ಹು', 'ಹೂಂ', 'ಸರಿ', 'ಓಕೆ', 'houdu', 'sari'].map(nfc),
);
export const NO_WORDS = new Set(
  ['no', 'nope', 'nahi', 'nahin', 'nai', 'na', 'wrong', 'galat', 'cancel', 'नहीं', 'नही', 'ना', 'गलत', 'ಇಲ್ಲ', 'ಬೇಡ', 'ಸರಿಯಲ್ಲ', 'illa', 'beda'].map(nfc),
);
