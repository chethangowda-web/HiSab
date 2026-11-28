import { describe, it, expect } from 'vitest';
import { nameKey, sameNameAcrossScripts } from '../src/domain/nameKey';
import { matchEmployers } from '../src/domain/queries';

describe('names across scripts', () => {
  it('gives the same key for Latin, Devanagari and Kannada spellings', () => {
    expect(nameKey('Ramesh')).toBe(nameKey('रमेश'));
    expect(nameKey('Ramesh')).toBe(nameKey('ರಮೇಶ್'));
    expect(nameKey('Suresh')).toBe(nameKey('सुरेश'));
    expect(nameKey('Kumar')).toBe(nameKey('ಕುಮಾರ್'));
  });

  it('does not match different names or same-script names', () => {
    expect(sameNameAcrossScripts('Ramesh', 'सुरेश')).toBe(false);
    expect(sameNameAcrossScripts('Ramesh', 'Rmsh')).toBe(false);
  });

  it('matchEmployers finds a saved Latin name from a Hindi or Kannada mention', () => {
    const emps = [{ id: '1', name: 'Ramesh' }, { id: '2', name: 'Suresh' }];
    expect(matchEmployers('रमेश', emps).map((e) => e.id)).toEqual(['1']);
    expect(matchEmployers('ಸುರೇಶ್', emps).map((e) => e.id)).toEqual(['2']);
    expect(matchEmployers('Ramesh', emps).map((e) => e.id)).toEqual(['1']);
  });
});
