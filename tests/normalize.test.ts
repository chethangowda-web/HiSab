import { describe, it, expect } from 'vitest';
import { parseNumber, parseHours, allNumbers, resolveDate, normalizeDigits } from '../src/nlu/normalize';

describe('normalizeDigits', () => {
  it('converts Devanagari and Kannada digits', () => {
    expect(normalizeDigits('७००')).toBe('700');
    expect(normalizeDigits('೭೦೦')).toBe('700');
    expect(normalizeDigits('a१b')).toBe('a1b');
  });
});

describe('parseNumber', () => {
  it.each([
    ['seven hundred', 700],
    ['seven hundred and fifty', 750],
    ['saat sau', 700],
    ['do sau pachaas', 250],
    ['ek hazaar', 1000],
    ['one thousand', 1000],
    ['ಏಳುನೂರು', 700],
    ['ಒಂದು ಸಾವಿರ', 1000],
    ['elunooru', 700],
    ['सात सौ', 700],
    ['एक हज़ार', 1000],
    ['೭೦೦', 700],
    ['७००', 700],
    ['₹700', 700],
    ['700', 700],
    ['1,000', 1000],
    ['₹1,000/-', 1000],
    ['I worked for 700 rupees', 700],
    ['1000 rupees advance', 1000],
  ])('%s -> %d', (text, expected) => {
    expect(parseNumber(text)).toBe(expected);
  });

  it('does not treat hours or days as money', () => {
    expect(parseNumber('two extra hours')).toBeNull();
    expect(parseNumber('2 hours')).toBeNull();
    expect(parseNumber('2hrs')).toBeNull();
    expect(parseNumber('do ghante extra')).toBeNull();
    expect(parseNumber('ek din')).toBeNull();
  });

  it('picks the money amount when days or hours are also present', () => {
    expect(parseNumber('worked 2 days for 1400 rupees')).toBe(1400);
  });

  it('does not read the English word "do" as the number two', () => {
    expect(parseNumber('How much do I owe')).toBeNull();
  });

  it('returns null when there is no number', () => {
    expect(parseNumber('hello there')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });

  it('ignores dates', () => {
    expect(parseNumber('on 2026-11-25')).toBeNull();
  });
});

describe('parseHours', () => {
  it.each([
    ['two extra hours', 2],
    ['3 hours overtime', 3],
    ['1.5 hours', 1.5],
    ['do ghante extra', 2],
    ['ಎರಡು ಗಂಟೆ', 2],
  ])('%s -> %d', (text, expected) => {
    expect(parseHours(text)).toBe(expected);
  });
  it('is null without an hour word', () => {
    expect(parseHours('700 rupees')).toBeNull();
  });
});

describe('allNumbers', () => {
  it('lists every number including hours', () => {
    expect(allNumbers('2 hours for 700 rupees').sort()).toEqual([2, 700]);
  });
});

describe('resolveDate', () => {
  const today = '2026-11-27';
  it.each([
    ['aaj', '2026-11-27'],
    ['today', '2026-11-27'],
    ['ಇಂದು', '2026-11-27'],
    ['आज', '2026-11-27'],
    ['kal', '2026-11-26'],
    ['yesterday', '2026-11-26'],
    ['ನಿನ್ನೆ', '2026-11-26'],
    ['कल', '2026-11-26'],
    ['day before yesterday', '2026-11-25'],
    ['parso', '2026-11-25'],
    ['on 2026-11-20', '2026-11-20'],
  ])('%s -> %s', (text, expected) => {
    expect(resolveDate(text, today)).toBe(expected);
  });
  it('crosses month boundaries', () => {
    expect(resolveDate('yesterday', '2026-12-01')).toBe('2026-11-30');
  });
  it('returns null when no date word is present', () => {
    expect(resolveDate('700 rupees', today)).toBeNull();
  });
});
