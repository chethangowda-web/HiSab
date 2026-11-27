export interface ParseRequest {
  transcript: string;
  lang: string;
  knownEmployers: string[];
  today: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** JSON schema the local model must follow. Every field is required, so "not said" comes back as null. */
export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['record', 'query', 'confirm', 'deny', 'unknown'] },
    type: { type: ['string', 'null'], enum: ['work', 'overtime', 'advance', 'payment', null] },
    employerName: { type: ['string', 'null'] },
    amount: { type: ['integer', 'null'] },
    hours: { type: ['number', 'null'] },
    date: { type: ['string', 'null'] },
    q: { type: ['string', 'null'], enum: ['owed', 'earned', 'advances', 'days', null] },
    period: { type: ['string', 'null'], enum: ['month', 'all', null] },
  },
  required: ['kind', 'type', 'employerName', 'amount', 'hours', 'date', 'q', 'period'],
  additionalProperties: false,
} as const;

const SYSTEM = `You extract structured data from one spoken sentence by a daily-wage worker in India. The sentence may be Kannada, Hindi, English or a mix, in native script or romanized. Reply with JSON only.

Rules:
1. Copy only what was actually said. Never guess, infer or calculate.
2. amount: rupees as a whole number exactly as spoken ("saat sau" = 700, "ek hazaar" = 1000). If no amount was said, amount is null.
3. hours: only if a number of hours was said, otherwise null.
4. employerName: the person's name exactly as said. Roles such as "contractor", "boss", "sir", "malik", "thekedar" are not names. If no name was said, null.
5. kind: "record" for work done, extra hours, advance taken, or money received; "query" for a question about money; "confirm" for yes; "deny" for no; otherwise "unknown".
6. type (for records): "work" = worked a day; "overtime" = extra hours; "advance" = advance money taken; "payment" = money received or paid.
7. q (for queries): "owed" = how much is still owed or pending; "earned" = how much was earned; "advances" = how much advance was taken; "days" = how many days worked. period is "month" only if this month was mentioned.
8. Do not include a date: always set date to null.`;

const EXAMPLES: [string, object][] = [
  [
    'Ramesh ne mujhe ek hazaar rupaye advance diye',
    { kind: 'record', type: 'advance', employerName: 'Ramesh', amount: 1000, hours: null, date: null, q: null, period: null },
  ],
  [
    'Ramesh sir gave me some money yesterday',
    { kind: 'record', type: 'payment', employerName: 'Ramesh', amount: null, hours: null, date: null, q: null, period: null },
  ],
  [
    'how much does Suresh owe me',
    { kind: 'query', type: null, employerName: 'Suresh', amount: null, hours: null, date: null, q: 'owed', period: null },
  ],
];

export function buildMessages(req: ParseRequest): ChatMessage[] {
  const known = req.knownEmployers.length ? `\nKnown employers (a hint only; use a name only if it was said): ${req.knownEmployers.join(', ')}.` : '';
  const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM + known }];
  for (const [sentence, answer] of EXAMPLES) {
    messages.push({ role: 'user', content: `Sentence: ${sentence}` });
    messages.push({ role: 'assistant', content: JSON.stringify(answer) });
  }
  messages.push({ role: 'user', content: `Sentence: ${req.transcript}` });
  return messages;
}

/** Returns an error message, or null if the request is acceptable. */
export function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return 'body must be an object';
  const b = body as Record<string, unknown>;
  if (typeof b.transcript !== 'string' || !b.transcript.trim()) return 'transcript must be a non-empty string';
  if (b.transcript.length > 1000) return 'transcript is too long';
  if (b.lang !== undefined && typeof b.lang !== 'string') return 'lang must be a string';
  if (!Array.isArray(b.knownEmployers) || b.knownEmployers.length > 50 || b.knownEmployers.some((e) => typeof e !== 'string' || e.length > 100)) {
    return 'knownEmployers must be a list of up to 50 short strings';
  }
  if (typeof b.today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.today)) return 'today must be yyyy-mm-dd';
  return null;
}
