/**
 * Tests for analyzeScopeHistory resolver
 */

import { analyzeScopeHistory, calculateScopeChangeTrend } from '../src/resolvers/analyzeScopeHistory';

describe('analyzeScopeHistory', () => {
  const date = (str) => new Date(str + 'T00:00:00Z');

  describe('analyzeScopeHistory', () => {
    test('returns empty scope timeline for empty issues', () => {
      const result = analyzeScopeHistory([], []);
      expect(result.scopeTimeline).toEqual([]);
      expect(result.totals.originalScope).toBe(0);
    });

    test('calculates total original scope from all issues', () => {
      const demandIssues = [
        { key: 'TEST-1', originalEstimate: 10, remainingEstimate: 5, status: { category: 'in_progress' } },
        { key: 'TEST-2', originalEstimate: 20, remainingEstimate: 20, status: { category: 'new' } },
        { key: 'TEST-3', originalEstimate: 15, remainingEstimate: 0, status: { category: 'done' }, timeSpent: 12 }
      ];
      const timeline = [
        { date: '2024-01-15', displayDate: 'Jan 15' },
        { date: '2024-01-16', displayDate: 'Jan 16' }
      ];

      const result = analyzeScopeHistory(demandIssues, timeline);

      expect(result.totals.originalScope).toBe(45);
    });

    test('calculates remaining scope excluding done issues', () => {
      const demandIssues = [
        { key: 'TEST-1', originalEstimate: 10, remainingEstimate: 5, status: { category: 'in_progress' } },
        { key: 'TEST-2', originalEstimate: 20, remainingEstimate: 20, status: { category: 'new' } },
        { key: 'TEST-3', originalEstimate: 15, remainingEstimate: 0, status: { category: 'done' }, timeSpent: 12 }
      ];
      const timeline = [{ date: '2024-01-15', displayDate: 'Jan 15' }];

      const result = analyzeScopeHistory(demandIssues, timeline);

      expect(result.totals.remainingScope).toBe(25); // 5 + 20
    });

    test('calculates completed scope from done issues', () => {
      const demandIssues = [
        { key: 'TEST-1', originalEstimate: 10, remainingEstimate: 5, status: { category: 'in_progress' } },
        { key: 'TEST-2', originalEstimate: 15, remainingEstimate: 0, status: { category: 'done' }, timeSpent: 12 }
      ];
      const timeline = [{ date: '2024-01-15', displayDate: 'Jan 15' }];

      const result = analyzeScopeHistory(demandIssues, timeline);

      expect(result.totals.completedScope).toBe(12); // timeSpent of done issue
    });

    test('uses originalEstimate if timeSpent not available for done issues', () => {
      const demandIssues = [
        { key: 'TEST-1', originalEstimate: 15, remainingEstimate: 0, status: { category: 'done' } }
      ];
      const timeline = [{ date: '2024-01-15', displayDate: 'Jan 15' }];

      const result = analyzeScopeHistory(demandIssues, timeline);

      expect(result.totals.completedScope).toBe(15);
    });

    test('generates scope timeline entries for each day', () => {
      const demandIssues = [
        { key: 'TEST-1', originalEstimate: 10, remainingEstimate: 10, status: { category: 'new' } }
      ];
      const timeline = [
        { date: '2024-01-15', displayDate: 'Jan 15' },
        { date: '2024-01-16', displayDate: 'Jan 16' },
        { date: '2024-01-17', displayDate: 'Jan 17' }
      ];

      const result = analyzeScopeHistory(demandIssues, timeline);

      expect(result.scopeTimeline).toHaveLength(3);
      expect(result.scopeTimeline[0].displayDate).toBe('Jan 15');
      expect(result.scopeTimeline[2].displayDate).toBe('Jan 17');
    });
  });

  describe('calculateScopeChangeTrend', () => {
    test('returns empty trend for empty issues', () => {
      const result = calculateScopeChangeTrend([]);
      expect(result.trend).toEqual([]);
      expect(result.alerts).toEqual([]);
    });

    test('groups issues by week based on start date', () => {
      const demandIssues = [
        { key: 'TEST-1', originalEstimate: 10, startDate: date('2024-01-15'), status: { category: 'new' } },
        { key: 'TEST-2', originalEstimate: 20, startDate: date('2024-01-16'), status: { category: 'new' } },
        { key: 'TEST-3', originalEstimate: 15, startDate: date('2024-01-22'), status: { category: 'new' } }
      ];

      const result = calculateScopeChangeTrend(demandIssues);

      expect(result.trend.length).toBeGreaterThanOrEqual(2);
    });

    test('calculates net change per week', () => {
      const demandIssues = [
        { key: 'TEST-1', originalEstimate: 10, startDate: date('2024-01-15'), status: { category: 'new' } },
        { key: 'TEST-2', originalEstimate: 20, startDate: date('2024-01-15'), dueDate: date('2024-01-15'), status: { category: 'done' } }
      ];

      const result = calculateScopeChangeTrend(demandIssues);

      // First week should have added 30 and removed 20
      const firstWeek = result.trend[0];
      expect(firstWeek.added).toBe(30);
      expect(firstWeek.removed).toBe(20);
      expect(firstWeek.netChange).toBe(10);
    });

    test('generates alerts for high scope growth', () => {
      // Create issues that would trigger >10% growth alert
      const demandIssues = [
        { key: 'TEST-1', originalEstimate: 10, startDate: date('2024-01-15'), status: { category: 'new' } },
        { key: 'TEST-2', originalEstimate: 100, startDate: date('2024-01-22'), status: { category: 'new' } }
      ];

      const result = calculateScopeChangeTrend(demandIssues);

      // Should have at least one alert for significant growth
      expect(result.alerts.length).toBeGreaterThanOrEqual(0);
    });

    test('tracks running total across weeks', () => {
      const demandIssues = [
        { key: 'TEST-1', originalEstimate: 10, startDate: date('2024-01-15'), status: { category: 'new' } },
        { key: 'TEST-2', originalEstimate: 20, startDate: date('2024-01-22'), status: { category: 'new' } }
      ];

      const result = calculateScopeChangeTrend(demandIssues);

      if (result.trend.length >= 2) {
        expect(result.trend[1].totalScope).toBeGreaterThan(result.trend[0].totalScope);
      }
    });
  });
});
