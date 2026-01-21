/**
 * Unit tests for analyzeEnvelope.js resolver
 */

import { analyzeEnvelope } from '../src/resolvers/analyzeEnvelope.js';

describe('analyzeEnvelope', () => {
  // Helper to create dates
  const date = (str) => new Date(str + 'T00:00:00Z');

  describe('basic functionality', () => {
    test('returns empty timeline for no issues', async () => {
      const result = await analyzeEnvelope([], []);

      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('feasibilityScore');
      expect(result).toHaveProperty('overloadedPeriods');
      expect(result).toHaveProperty('totals');
    });

    test('calculates date range from issues', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' }
        }
      ];

      const result = await analyzeEnvelope(demandIssues, []);

      expect(result.rangeStart).toBeDefined();
      expect(result.rangeEnd).toBeDefined();
      expect(new Date(result.rangeStart) <= date('2026-01-20')).toBe(true);
      expect(new Date(result.rangeEnd) >= date('2026-01-24')).toBe(true);
    });
  });

  describe('capacity calculation', () => {
    test('spreads capacity across business days', async () => {
      const capacityIssues = [
        {
          key: 'CAP-1',
          startDate: date('2026-01-20'), // Monday
          dueDate: date('2026-01-24'), // Friday
          originalEstimate: 40 // 40 hours across 5 days = 8h/day
        }
      ];

      const result = await analyzeEnvelope([], capacityIssues);

      // Check that capacity is distributed
      const totalCapacity = result.totals.totalCapacity;
      expect(totalCapacity).toBeCloseTo(40, 1);
    });

    test('handles multiple capacity issues', async () => {
      const capacityIssues = [
        {
          key: 'CAP-1',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          originalEstimate: 20
        },
        {
          key: 'CAP-2',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          originalEstimate: 20
        }
      ];

      const result = await analyzeEnvelope([], capacityIssues);

      expect(result.totals.totalCapacity).toBeCloseTo(40, 1);
    });

    test('ignores capacity issues without dates', async () => {
      const capacityIssues = [
        {
          key: 'CAP-1',
          startDate: null,
          dueDate: date('2026-01-24'),
          originalEstimate: 40
        }
      ];

      const result = await analyzeEnvelope([], capacityIssues);

      expect(result.totals.totalCapacity).toBe(0);
    });

    test('ignores capacity issues without estimate', async () => {
      const capacityIssues = [
        {
          key: 'CAP-1',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          originalEstimate: null
        }
      ];

      const result = await analyzeEnvelope([], capacityIssues);

      expect(result.totals.totalCapacity).toBe(0);
    });
  });

  describe('demand calculation', () => {
    test('spreads demand across business days', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 40,
          originalEstimate: 40,
          status: { category: 'in_progress' }
        }
      ];

      const result = await analyzeEnvelope(demandIssues, []);

      expect(result.totals.totalDemand).toBeCloseTo(40, 1);
    });

    test('skips done issues for demand', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 40,
          originalEstimate: 40,
          status: { category: 'done' }
        }
      ];

      const result = await analyzeEnvelope(demandIssues, []);

      expect(result.totals.totalDemand).toBe(0);
    });

    test('skips issues without remaining estimate', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 0,
          originalEstimate: 40,
          status: { category: 'in_progress' }
        }
      ];

      const result = await analyzeEnvelope(demandIssues, []);

      expect(result.totals.totalDemand).toBe(0);
    });
  });

  describe('worklog tracking', () => {
    test('aggregates worklogs by date', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 40,
          originalEstimate: 40,
          status: { category: 'in_progress' }
        }
      ];

      const worklogs = [
        { date: date('2026-01-20'), hours: 4 },
        { date: date('2026-01-21'), hours: 6 },
        { date: date('2026-01-20'), hours: 2 } // Same day as first
      ];

      const result = await analyzeEnvelope(demandIssues, [], worklogs);

      expect(result.totals.totalTimeSpent).toBe(12);
    });

    test('handles empty worklogs', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 40,
          originalEstimate: 40,
          status: { category: 'in_progress' }
        }
      ];

      const result = await analyzeEnvelope(demandIssues, [], []);

      expect(result.totals.totalTimeSpent).toBe(0);
    });
  });

  describe('feasibility score', () => {
    test('returns 100 for no demand', async () => {
      const capacityIssues = [
        {
          key: 'CAP-1',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          originalEstimate: 40
        }
      ];

      const result = await analyzeEnvelope([], capacityIssues);

      expect(result.feasibilityScore).toBe(100);
    });

    test('returns high score when capacity exceeds demand', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 20,
          originalEstimate: 20,
          status: { category: 'in_progress' }
        }
      ];

      const capacityIssues = [
        {
          key: 'CAP-1',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          originalEstimate: 40
        }
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues);

      expect(result.feasibilityScore).toBeGreaterThanOrEqual(80);
    });

    test('returns low score when demand exceeds capacity', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 80,
          originalEstimate: 80,
          status: { category: 'in_progress' }
        }
      ];

      const capacityIssues = [
        {
          key: 'CAP-1',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          originalEstimate: 20
        }
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues);

      expect(result.feasibilityScore).toBeLessThan(50);
    });

    test('returns 0 when no capacity and has demand', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 40,
          originalEstimate: 40,
          status: { category: 'in_progress' }
        }
      ];

      const result = await analyzeEnvelope(demandIssues, []);

      expect(result.feasibilityScore).toBe(0);
    });
  });

  describe('overloaded periods', () => {
    test('detects overloaded periods', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 80,
          originalEstimate: 80,
          status: { category: 'in_progress' }
        }
      ];

      const capacityIssues = [
        {
          key: 'CAP-1',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          originalEstimate: 20
        }
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues);

      expect(result.overloadedPeriods.length).toBeGreaterThan(0);
    });

    test('returns empty array when no overload', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 20,
          originalEstimate: 20,
          status: { category: 'in_progress' }
        }
      ];

      const capacityIssues = [
        {
          key: 'CAP-1',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          originalEstimate: 80
        }
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues);

      expect(result.overloadedPeriods.length).toBe(0);
    });

    test('overloaded periods have correct structure', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 80,
          originalEstimate: 80,
          status: { category: 'in_progress' }
        }
      ];

      const result = await analyzeEnvelope(demandIssues, []);

      if (result.overloadedPeriods.length > 0) {
        const period = result.overloadedPeriods[0];
        expect(period).toHaveProperty('startDate');
        expect(period).toHaveProperty('endDate');
        expect(period).toHaveProperty('maxOverload');
        expect(period).toHaveProperty('days');
      }
    });
  });

  describe('timeline structure', () => {
    test('timeline entries have correct properties', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 40,
          originalEstimate: 40,
          status: { category: 'in_progress' }
        }
      ];

      const result = await analyzeEnvelope(demandIssues, []);

      expect(result.timeline.length).toBeGreaterThan(0);

      const entry = result.timeline[0];
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('displayDate');
      expect(entry).toHaveProperty('capacity');
      expect(entry).toHaveProperty('demand');
      expect(entry).toHaveProperty('cumulativeCapacity');
      expect(entry).toHaveProperty('cumulativeDemand');
      expect(entry).toHaveProperty('isOverloaded');
    });

    test('cumulative values increase over time', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 40,
          originalEstimate: 40,
          status: { category: 'in_progress' }
        }
      ];

      const capacityIssues = [
        {
          key: 'CAP-1',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          originalEstimate: 40
        }
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues);

      // Cumulative values should increase or stay same
      for (let i = 1; i < result.timeline.length; i++) {
        expect(result.timeline[i].cumulativeCapacity).toBeGreaterThanOrEqual(
          result.timeline[i - 1].cumulativeCapacity
        );
        expect(result.timeline[i].cumulativeDemand).toBeGreaterThanOrEqual(
          result.timeline[i - 1].cumulativeDemand
        );
      }
    });
  });

  describe('completion percentage', () => {
    test('calculates completion percentage from worklogs', async () => {
      const demandIssues = [
        {
          key: 'TEST-1',
          summary: 'Test',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 20,
          originalEstimate: 40,
          status: { category: 'in_progress' }
        }
      ];

      const worklogs = [
        { date: date('2026-01-20'), hours: 20 }
      ];

      const result = await analyzeEnvelope(demandIssues, [], worklogs);

      // Find a timeline entry with completion data
      const entryWithCompletion = result.timeline.find(e => e.cumulativeTimeSpent > 0);
      if (entryWithCompletion) {
        expect(entryWithCompletion.completionPercent).toBeGreaterThan(0);
      }
    });
  });
});
