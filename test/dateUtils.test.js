/**
 * Unit tests for dateUtils.js utility functions
 */

import {
  parseJiraDate,
  secondsToHours,
  isPast,
  isToday,
  getToday,
  formatDisplayDate,
  formatShortDate,
  daysDifference
} from '../src/utils/dateUtils.js';

describe('dateUtils utilities', () => {
  describe('parseJiraDate', () => {
    test('parses ISO 8601 date string', () => {
      const result = parseJiraDate('2026-01-21T10:30:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(21);
    });

    test('parses plain date string', () => {
      const result = parseJiraDate('2026-01-21');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2026);
    });

    test('returns null for null input', () => {
      expect(parseJiraDate(null)).toBeNull();
    });

    test('returns null for undefined input', () => {
      expect(parseJiraDate(undefined)).toBeNull();
    });

    test('returns null for empty string', () => {
      expect(parseJiraDate('')).toBeNull();
    });

    test('returns null for invalid date string', () => {
      expect(parseJiraDate('not-a-date')).toBeNull();
    });
  });

  describe('secondsToHours', () => {
    test('converts seconds to hours', () => {
      expect(secondsToHours(3600)).toBe(1);
      expect(secondsToHours(7200)).toBe(2);
      expect(secondsToHours(1800)).toBe(0.5);
    });

    test('returns 0 for null', () => {
      expect(secondsToHours(null)).toBe(0);
    });

    test('returns 0 for undefined', () => {
      expect(secondsToHours(undefined)).toBe(0);
    });

    test('returns 0 for non-number', () => {
      expect(secondsToHours('3600')).toBe(0);
    });

    test('handles zero seconds', () => {
      expect(secondsToHours(0)).toBe(0);
    });

    test('handles large values', () => {
      expect(secondsToHours(86400)).toBe(24); // 1 day
    });
  });

  describe('isPast', () => {
    test('returns true for past date', () => {
      const pastDate = new Date('2020-01-01');
      expect(isPast(pastDate)).toBe(true);
    });

    test('returns false for future date', () => {
      const futureDate = new Date('2030-01-01');
      expect(isPast(futureDate)).toBe(false);
    });

    test('returns false for null', () => {
      expect(isPast(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isPast(undefined)).toBe(false);
    });
  });

  describe('isToday', () => {
    test('returns true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    test('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    test('returns false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });

    test('returns false for null', () => {
      expect(isToday(null)).toBe(false);
    });
  });

  describe('getToday', () => {
    test('returns a Date object', () => {
      expect(getToday()).toBeInstanceOf(Date);
    });

    test('returns today at midnight UTC', () => {
      const today = getToday();
      expect(today.getUTCHours()).toBe(0);
      expect(today.getUTCMinutes()).toBe(0);
      expect(today.getUTCSeconds()).toBe(0);
      expect(today.getUTCMilliseconds()).toBe(0);
    });
  });

  describe('formatDisplayDate', () => {
    test('formats date correctly', () => {
      const date = new Date('2026-01-21T00:00:00Z');
      const formatted = formatDisplayDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('21');
      expect(formatted).toContain('2026');
    });

    test('returns N/A for null', () => {
      expect(formatDisplayDate(null)).toBe('N/A');
    });

    test('returns N/A for undefined', () => {
      expect(formatDisplayDate(undefined)).toBe('N/A');
    });
  });

  describe('formatShortDate', () => {
    test('formats date without year', () => {
      const date = new Date('2026-01-21T00:00:00Z');
      const formatted = formatShortDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('21');
      expect(formatted).not.toContain('2026');
    });

    test('returns N/A for null', () => {
      expect(formatShortDate(null)).toBe('N/A');
    });
  });

  describe('daysDifference', () => {
    test('calculates positive difference', () => {
      const date1 = new Date('2026-01-20T00:00:00Z');
      const date2 = new Date('2026-01-25T00:00:00Z');
      expect(daysDifference(date1, date2)).toBe(5);
    });

    test('calculates negative difference', () => {
      const date1 = new Date('2026-01-25T00:00:00Z');
      const date2 = new Date('2026-01-20T00:00:00Z');
      expect(daysDifference(date1, date2)).toBe(-5);
    });

    test('returns 0 for same date', () => {
      const date = new Date('2026-01-21T00:00:00Z');
      expect(daysDifference(date, date)).toBe(0);
    });

    test('returns 0 when date1 is null', () => {
      const date = new Date('2026-01-21T00:00:00Z');
      expect(daysDifference(null, date)).toBe(0);
    });

    test('returns 0 when date2 is null', () => {
      const date = new Date('2026-01-21T00:00:00Z');
      expect(daysDifference(date, null)).toBe(0);
    });

    test('handles month boundaries', () => {
      const date1 = new Date('2026-01-30T00:00:00Z');
      const date2 = new Date('2026-02-02T00:00:00Z');
      expect(daysDifference(date1, date2)).toBe(3);
    });
  });
});
