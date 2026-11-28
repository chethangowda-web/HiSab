import { describe, it, expect } from 'vitest';
import { shouldSwitchLanguage } from '../src/voice/language';

const say = 'Ramesh ke yahan 700 kaam kiya';

describe('shouldSwitchLanguage', () => {
  it('switches when Hindi or Kannada is clearly heard', () => {
    expect(shouldSwitchLanguage(say, 'hi-IN', 0.95, 'en-IN')).toBe(true);
    expect(shouldSwitchLanguage('ನಾನು ರಮೇಶ್ ಹತ್ತಿರ ಕೆಲಸ ಮಾಡಿದೆ', 'kn-IN', 0.9, 'hi-IN')).toBe(true);
    expect(shouldSwitchLanguage(say, 'en-IN', 0.8, 'kn-IN')).toBe(true);
  });
  it('switches when the engine gives no probability', () => {
    expect(shouldSwitchLanguage(say, 'hi-IN', undefined, 'en-IN')).toBe(true);
  });
  it('does not switch for short answers like haan / yes / no / a name', () => {
    expect(shouldSwitchLanguage('haan', 'hi-IN', 0.99, 'en-IN')).toBe(false);
    expect(shouldSwitchLanguage('Yes please', 'en-IN', 0.99, 'hi-IN')).toBe(false);
    expect(shouldSwitchLanguage('ಹೌದು', 'kn-IN', 0.99, 'en-IN')).toBe(false);
  });
  it('does not switch on low confidence, an unsupported language, or the same language', () => {
    expect(shouldSwitchLanguage(say, 'hi-IN', 0.5, 'en-IN')).toBe(false);
    expect(shouldSwitchLanguage(say, undefined, 0.99, 'en-IN')).toBe(false);
    expect(shouldSwitchLanguage(say, 'hi-IN', 0.99, 'hi-IN')).toBe(false);
  });
});
