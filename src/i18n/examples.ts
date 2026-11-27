import type { Lang } from '../domain/types';

/** "You can say" sentences shown on the home screen: work, advance, then a question. Each is tested to parse. */
export const EXAMPLES: Record<Lang, [string, string, string]> = {
  'en-IN': ['I worked at Ramesh for 700 rupees today', 'Ramesh gave me 1000 rupees advance', 'How much does Ramesh owe me?'],
  'hi-IN': ['आज रमेश के यहाँ 700 रुपये काम किया', 'रमेश ने 1000 रुपये एडवांस दिया', 'रमेश ने कितना देना है?'],
  'kn-IN': ['ಇಂದು ರಮೇಶ್ ಅವರ ಬಳಿ 700 ರೂಪಾಯಿ ಕೆಲಸ ಮಾಡಿದೆ', 'ರಮೇಶ್ ಅವರು 1000 ರೂಪಾಯಿ ಮುಂಗಡ ಕೊಟ್ಟರು', 'ರಮೇಶ್ ಅವರು ನನಗೆ ಎಷ್ಟು ಕೊಡಬೇಕು?'],
};
