import type { Lang } from '../domain/types';

/** "You can say" sentences shown on the home screen: work, advance, then a question. Each is tested to parse. */
export const EXAMPLES: Record<Lang, [string, string, string]> = {
  'en-IN': ['I worked at Ramesh for 700 rupees today', 'Ramesh gave me 1000 rupees advance', 'How much does Ramesh owe me?'],
  'hi-IN': ['आज रमेश के यहाँ 700 रुपये काम किया', 'रमेश ने 1000 रुपये एडवांस दिया', 'रमेश ने कितना देना है?'],
  'kn-IN': ['ಇಂದು ರಮೇಶ್ ಅವರ ಬಳಿ 700 ರೂಪಾಯಿ ಕೆಲಸ ಮಾಡಿದೆ', 'ರಮೇಶ್ ಅವರು 1000 ರೂಪಾಯಿ ಮುಂಗಡ ಕೊಟ್ಟರು', 'ರಮೇಶ್ ಅವರು ನನಗೆ ಎಷ್ಟು ಕೊಡಬೇಕು?'],
};

/** Voice commands shown on the home screen: statement, reminder, undo, set rate. Each is tested to parse. */
export const COMMAND_EXAMPLES: Record<Lang, [string, string, string, string]> = {
  'en-IN': ['Ramesh ka hisab dikhao', 'Ramesh ko yaad dilao', 'aakhri entry hatao', 'Ramesh ka rate 750 hai'],
  'hi-IN': ['रमेश का हिसाब दिखाओ', 'रमेश को याद दिलाओ', 'आखिरी एंट्री हटाओ', 'रमेश का रेट 750 है'],
  'kn-IN': ['ರಮೇಶ್ ಅವರ ಲೆಕ್ಕ ತೋರಿಸಿ', 'ರಮೇಶ್ ಅವರಿಗೆ ನೆನಪಿಸು', 'ಕೊನೆಯ ದಾಖಲೆ ಅಳಿಸಿ', 'ರಮೇಶ್ ಅವರ ರೇಟ್ 750'],
};
