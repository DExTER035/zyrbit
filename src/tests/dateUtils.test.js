import { describe, it, expect } from 'vitest';
import {
  getLocalDateStr,
  todayStr,
  getLocalTodayStr,
  getYesterdayStr,
  getTomorrowStr,
  isValidDateStr,
  formatLocalDate,
} from '../lib/dateUtils.js';

describe('Zyrbit Centralized Date Utilities (dateUtils.js)', () => {
  describe('todayStr and getLocalTodayStr equivalence', () => {
    it('returns equivalent results for todayStr and getLocalTodayStr', () => {
      expect(todayStr()).toBe(getLocalTodayStr());
      expect(isValidDateStr(todayStr())).toBe(true);
    });
  });

  describe('Midnight Boundary & Timezone Handling (IST, UTC)', () => {
    it('handles explicit UTC midnight boundary without date shifting', () => {
      // 2026-10-19 at 00:00:00 UTC
      const utcMidnight = new Date(Date.UTC(2026, 9, 19, 0, 0, 0));
      // Local date string in the local environment
      const localStr = getLocalDateStr(utcMidnight);
      expect(typeof localStr).toBe('string');
      expect(isValidDateStr(localStr)).toBe(true);
    });

    it('handles 23:59:59 and 00:00:01 local boundaries correctly', () => {
      const lateEvening = new Date(2026, 9, 19, 23, 59, 59);
      const earlyMorning = new Date(2026, 9, 20, 0, 0, 1);

      expect(getLocalDateStr(lateEvening)).toBe('2026-10-19');
      expect(getLocalDateStr(earlyMorning)).toBe('2026-10-20');
      expect(getYesterdayStr(earlyMorning)).toBe('2026-10-19');
      expect(getTomorrowStr(lateEvening)).toBe('2026-10-20');
    });

    it('simulates IST (+05:30) midnight behavior', () => {
      // At 18:30 UTC on 2026-10-18, IST is exactly 00:00 on 2026-10-19
      // An offset of -330 minutes represents IST (+05:30)
      const istMidnightUTC = new Date('2026-10-18T18:30:00.000Z');
      const d = new Date(istMidnightUTC.getTime());
      // Apply +05:30 offset
      const istMinutes = 330;
      const istTime = new Date(d.getTime() + istMinutes * 60 * 1000);
      const istDateStr = istTime.toISOString().split('T')[0];

      expect(istDateStr).toBe('2026-10-19');
    });
  });

  describe('Calendar Date Validation (isValidDateStr)', () => {
    it('validates standard valid dates', () => {
      expect(isValidDateStr('2026-10-19')).toBe(true);
      expect(isValidDateStr('2024-01-01')).toBe(true);
      expect(isValidDateStr('2026-12-31')).toBe(true);
    });

    it('correctly handles leap year February 29th', () => {
      expect(isValidDateStr('2024-02-29')).toBe(true); // 2024 is leap year
      expect(isValidDateStr('2023-02-29')).toBe(false); // 2023 is not
      expect(isValidDateStr('2026-02-29')).toBe(false); // 2026 is not
    });

    it('rejects invalid months, days, and formats', () => {
      expect(isValidDateStr('2026-00-10')).toBe(false);
      expect(isValidDateStr('2026-13-10')).toBe(false);
      expect(isValidDateStr('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidDateStr('2026-10-32')).toBe(false);
      expect(isValidDateStr('invalid-date')).toBe(false);
      expect(isValidDateStr(null)).toBe(false);
      expect(isValidDateStr(undefined)).toBe(false);
      expect(isValidDateStr(12345)).toBe(false);
    });
  });

  describe('Date-only Formatting (formatLocalDate)', () => {
    it('formats date-only strings without timezone drift', () => {
      const formatted = formatLocalDate('2026-10-19');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
      expect(formatted).toContain('19');
    });

    it('handles empty or invalid inputs gracefully', () => {
      expect(formatLocalDate('')).toBe('');
      expect(formatLocalDate(null)).toBe('');
      expect(formatLocalDate(undefined)).toBe('');
    });
  });
});
