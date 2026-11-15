import { describe, expect, it } from 'vitest';
import mapping from '../shared/prayer-methods.cjs';
import { getCalculationMethod } from '../src/lib/prayerTimes.js';

describe('shared prayer method mapping', () => {
  it('uses the same timezone-based auto method in the client and shared resolver', () => {
    for (const [timezone, method] of Object.entries(mapping.TIMEZONE_METHODS)) {
      expect(getCalculationMethod(timezone)).toBe(method);
      expect(mapping.resolvePrayerMethod('auto', timezone)).toBe(method);
    }
  });
  it('uses Egyptian as the explicit shared fallback when timezone is unknown', () => {
    expect(getCalculationMethod('Etc/UTC')).toBe(5);
    expect(mapping.resolvePrayerMethod('auto', undefined)).toBe(5);
    expect(mapping.resolvePrayerMethod('999', 'Asia/Riyadh')).toBe(5);
  });
  it('maps method 3 to Moonsighting Committee on both sides and preserves explicit selection', () => {
    expect(mapping.METHOD_NAMES[mapping.resolvePrayerMethod('3', 'Africa/Cairo')]).toBe('MoonsightingCommittee');
    expect(mapping.resolvePrayerMethod('3', 'Africa/Cairo')).toBe(3);
    expect(mapping.ALADHAN_API_METHODS[3]).toBe(15);
    expect(mapping.resolvePrayerMethod('4', 'America/New_York')).toBe(4);
  });
  it('maps regional method aliases to their matching adhan calculation methods', () => {
    expect(mapping.METHOD_NAMES[mapping.resolvePrayerMethod('21')]).toBe('MuslimWorldLeague');
    expect(mapping.METHOD_NAMES[mapping.resolvePrayerMethod('23')]).toBe('MuslimWorldLeague');
  });
});
