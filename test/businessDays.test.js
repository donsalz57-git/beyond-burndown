/**
 * Unit tests for businessDays.js utility functions
 */

import {
  isBusinessDay,
  getBusinessDaysBetween,
  countBusinessDays,
  addBusinessDays,
  getDateRange,
  formatDateKey
} from '../src/utils/businessDays.js';

describe('businessDays utilities', () => {
  describe('isBusinessDay', () => {
    test('returns true for Monday', () => {
      const monday = new Date('2026-01-19T00:00:00Z'); // Monday
      expect(isBusinessDay(monday)).toBe(true);
    });

    test('returns true for Friday', () => {
      const friday = new Date('2026-01-23T00:00:00Z'); // Friday
      expect(isBusinessDay(friday)).toBe(true);
    });

    test('returns false for Saturday', () => {
      const saturday = new Date('2026-01-24T00:00:00Z'); // Saturday
      expect(isBusinessDay(saturday)).toBe(false);
    });

    test('returns false for Sunday', () => {
      const sunday = new Date('2026-01-25T00:00:00Z'); // Sunday
      expect(isBusinessDay(sunday)).toBe(false);
    });

    test('returns true for Wednesday', () => {
      const wednesday = new Date('2026-01-21T00:00:00Z'); // Wednesday
      expect(isBusinessDay(wednesday)).toBe(true);
    });
  });

  describe('getBusinessDaysBetween', () => {
    test('returns correct business days for a full week', () => {
      const start = new Date('2026-01-19T00:00:00Z'); // Monday
      const end = new Date('2026-01-25T00:00:00Z'); // Sunday
      const days = getBusinessDaysBetween(start, end);
      expect(days.length).toBe(5); // Mon-Fri
    });

    test('returns single day when start equals end on business day', () => {
      const date = new Date('2026-01-21T00:00:00Z'); // Wednesday
      const days = getBusinessDaysBetween(date, date);
      expect(days.length).toBe(1);
    });

    test('returns empty array when start equals end on weekend', () => {
      const date = new Date('2026-01-24T00:00:00Z'); // Saturday
      const days = getBusinessDaysBetween(date, date);
      expect(days.length).toBe(0);
    });

    test('returns correct days for two weeks', () => {
      const start = new Date('2026-01-19T00:00:00Z'); // Monday
      const end = new Date('2026-02-01T00:00:00Z'); // Sunday
      const days = getBusinessDaysBetween(start, end);
      expect(days.length).toBe(10); // 2 weeks of business days
    });

    test('handles month boundaries', () => {
      const start = new Date('2026-01-30T00:00:00Z'); // Friday
      const end = new Date('2026-02-02T00:00:00Z'); // Monday
      const days = getBusinessDaysBetween(start, end);
      expect(days.length).toBe(2); // Friday + Monday
    });
  });

  describe('countBusinessDays', () => {
    test('returns 5 for a full business week', () => {
      const start = new Date('2026-01-19T00:00:00Z'); // Monday
      const end = new Date('2026-01-23T00:00:00Z'); // Friday
      expect(countBusinessDays(start, end)).toBe(5);
    });

    test('returns 0 for weekend only range', () => {
      const start = new Date('2026-01-24T00:00:00Z'); // Saturday
      const end = new Date('2026-01-25T00:00:00Z'); // Sunday
      expect(countBusinessDays(start, end)).toBe(0);
    });

    test('returns 1 for single business day', () => {
      const date = new Date('2026-01-21T00:00:00Z'); // Wednesday
      expect(countBusinessDays(date, date)).toBe(1);
    });
  });

  describe('addBusinessDays', () => {
    test('adds business days skipping weekends', () => {
      const friday = new Date('2026-01-23T00:00:00Z'); // Friday
      const result = addBusinessDays(friday, 1);
      expect(result.getUTCDay()).toBe(1); // Monday
    });

    test('adds multiple business days', () => {
      const monday = new Date('2026-01-19T00:00:00Z'); // Monday
      const result = addBusinessDays(monday, 5);
      // Should be next Monday (skips weekend)
      expect(result.getUTCDate()).toBe(26);
    });

    test('subtracts business days when negative', () => {
      const monday = new Date('2026-01-26T00:00:00Z'); // Monday
      const result = addBusinessDays(monday, -1);
      expect(result.getUTCDay()).toBe(5); // Friday
    });

    test('handles zero days', () => {
      const date = new Date('2026-01-21T00:00:00Z');
      const result = addBusinessDays(date, 0);
      expect(result.getTime()).toBe(date.getTime());
    });
  });

  describe('getDateRange', () => {
    test('returns default range for empty array', () => {
      const range = getDateRange([]);
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
    });

    test('adds buffer days to date range', () => {
      const dates = [
        new Date('2026-01-20T00:00:00Z'),
        new Date('2026-01-25T00:00:00Z')
      ];
      const range = getDateRange(dates, 5);
      expect(range.start < dates[0]).toBe(true);
      expect(range.end > dates[1]).toBe(true);
    });

    test('filters out invalid dates', () => {
      const dates = [
        new Date('2026-01-20T00:00:00Z'),
        new Date('invalid'),
        null,
        new Date('2026-01-25T00:00:00Z')
      ];
      const range = getDateRange(dates, 0);
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
    });
  });

  describe('formatDateKey', () => {
    test('formats date as YYYY-MM-DD', () => {
      const date = new Date('2026-01-21T12:30:00Z');
      expect(formatDateKey(date)).toBe('2026-01-21');
    });

    test('pads single digit months and days', () => {
      const date = new Date('2026-02-05T00:00:00Z');
      expect(formatDateKey(date)).toBe('2026-02-05');
    });
  });
});
