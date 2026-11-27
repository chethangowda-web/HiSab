import { describe, it, expect } from 'vitest';
import { localISODate } from '../src/domain/dates';

describe('localISODate', () => {
  it('uses the local calendar date, not UTC', () => {
    // 00:30 local time on 27 Nov. In IST (UTC+5:30) toISOString() would say 26 Nov.
    expect(localISODate(new Date(2026, 10, 27, 0, 30))).toBe('2026-11-27');
  });
  it('zero-pads month and day', () => {
    expect(localISODate(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });
  it('late evening stays on the same day', () => {
    expect(localISODate(new Date(2026, 10, 27, 23, 59))).toBe('2026-11-27');
  });
});
