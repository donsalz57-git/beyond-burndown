/**
 * Tests for scenarioCalculator utility functions
 * Updated to test 8 hrs/day default and edge cases
 */

import {
  applyAddCapacity,
  applyRemoveScope,
  applyExtendDeadline
} from './scenarioCalculator';

describe('scenarioCalculator', () => {
  const createMockEnvelope = () => ({
    feasibilityScore: 75,
    totals: {
      totalCapacity: 100,
      totalDemand: 120,
      totalOriginalEstimate: 150,
      totalTimeSpent: 50,
      totalDays: 20
    },
    timeline: [
      { date: '2024-01-15', isOverloaded: true },
      { date: '2024-01-16', isOverloaded: true },
      { date: '2024-01-17', isOverloaded: false }
    ],
    forecast: {
      forecastDate: '2024-03-05T00:00:00Z',
      extraDays: 5,
      gap: 20,
      avgDailyCapacity: 5,
      status: 'warning'
    }
  });

  describe('applyAddCapacity', () => {
    test('increases capacity when adding developers', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 2);

      expect(result.result.capacity).toBeGreaterThan(envelope.totals.totalCapacity);
      expect(result.delta.capacity).toBeGreaterThan(0);
    });

    test('improves feasibility score', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 2);

      expect(result.result.feasibilityScore).toBeGreaterThan(envelope.feasibilityScore);
    });

    test('returns proper structure', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 1);

      expect(result.type).toBe('add_capacity');
      expect(result.original).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.delta).toBeDefined();
    });

    test('defaults to 8 hours per developer per day', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 1);

      // 1 developer * 8 hrs/day * 20 days = 160 additional capacity
      expect(result.delta.capacity).toBe(160);
    });

    test('respects custom hours per developer', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 1, 6);

      // 1 developer * 6 hrs/day * 20 days = 120 additional capacity
      expect(result.delta.capacity).toBe(120);
    });

    test('calculates correct capacity for multiple developers', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 3, 8);

      // 3 developers * 8 hrs/day * 20 days = 480 additional capacity
      expect(result.delta.capacity).toBe(480);
    });

    test('generates correct description', () => {
      const envelope = createMockEnvelope();

      const singleDev = applyAddCapacity(envelope, 1);
      expect(singleDev.description).toBe('Add 1 developer');

      const multiDev = applyAddCapacity(envelope, 3);
      expect(multiDev.description).toBe('Add 3 developers');
    });

    test('handles zero demand gracefully', () => {
      const envelope = {
        ...createMockEnvelope(),
        totals: { ...createMockEnvelope().totals, totalDemand: 0 }
      };
      const result = applyAddCapacity(envelope, 1);

      expect(result.result.feasibilityScore).toBe(100);
    });
  });

  describe('applyRemoveScope', () => {
    test('reduces demand when removing hours', () => {
      const envelope = createMockEnvelope();
      const result = applyRemoveScope(envelope, 30);

      expect(result.result.demand).toBe(envelope.totals.totalDemand - 30);
      expect(result.delta.demand).toBe(-30);
    });

    test('improves feasibility score', () => {
      const envelope = createMockEnvelope();
      const result = applyRemoveScope(envelope, 30);

      expect(result.result.feasibilityScore).toBeGreaterThan(envelope.feasibilityScore);
    });

    test('returns proper structure', () => {
      const envelope = createMockEnvelope();
      const result = applyRemoveScope(envelope, 20);

      expect(result.type).toBe('remove_scope');
      expect(result.original).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.delta).toBeDefined();
    });

    test('generates correct description', () => {
      const envelope = createMockEnvelope();
      const result = applyRemoveScope(envelope, 25);

      expect(result.description).toBe('Remove 25h of scope');
    });

    test('does not reduce demand below zero', () => {
      const envelope = createMockEnvelope();
      const result = applyRemoveScope(envelope, 200); // More than total demand

      expect(result.result.demand).toBe(0);
    });

    test('calculates 100% feasibility when demand becomes zero', () => {
      const envelope = createMockEnvelope();
      const result = applyRemoveScope(envelope, 200);

      expect(result.result.feasibilityScore).toBe(100);
    });

    test('records original values correctly', () => {
      const envelope = createMockEnvelope();
      const result = applyRemoveScope(envelope, 20);

      expect(result.original.feasibilityScore).toBe(envelope.feasibilityScore);
      expect(result.original.demand).toBe(envelope.totals.totalDemand);
    });
  });

  describe('applyExtendDeadline', () => {
    test('increases capacity when extending deadline', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 1);

      expect(result.result.capacity).toBeGreaterThan(envelope.totals.totalCapacity);
      expect(result.delta.capacity).toBeGreaterThan(0);
    });

    test('improves feasibility score', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 2);

      expect(result.result.feasibilityScore).toBeGreaterThan(envelope.feasibilityScore);
    });

    test('returns proper structure', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 1);

      expect(result.type).toBe('extend_deadline');
      expect(result.original).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.delta).toBeDefined();
    });

    test('uses 5 business days per week', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 1);

      // 1 week = 5 business days
      // Average daily capacity = 100/20 = 5
      // Additional capacity = 5 * 5 = 25
      expect(result.delta.capacity).toBe(25);
    });

    test('calculates correct capacity for multiple weeks', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 2);

      // 2 weeks = 10 business days
      // Additional capacity = 5 * 10 = 50
      expect(result.delta.capacity).toBe(50);
    });

    test('generates correct description', () => {
      const envelope = createMockEnvelope();

      const oneWeek = applyExtendDeadline(envelope, 1);
      expect(oneWeek.description).toBe('Extend deadline by 1 week');

      const twoWeeks = applyExtendDeadline(envelope, 2);
      expect(twoWeeks.description).toBe('Extend deadline by 2 weeks');
    });

    test('reduces forecast extra days', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 1);

      // Original extraDays = 5, extending by 1 week (5 days) should reduce or eliminate
      expect(result.result.forecastExtraDays).toBeLessThan(envelope.forecast.extraDays);
    });

    test('includes buffer gained in delta', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 1);

      expect(result.delta.bufferGained).toBeDefined();
      expect(result.delta.bufferGained).toBeGreaterThan(0);
    });

    test('handles zero total days gracefully', () => {
      const envelope = {
        ...createMockEnvelope(),
        totals: { ...createMockEnvelope().totals, totalDays: 0 }
      };
      const result = applyExtendDeadline(envelope, 1);

      // Should not throw, should return a valid result
      expect(result.delta.capacity).toBe(0);
    });
  });

  describe('edge cases', () => {
    test('handles missing forecast data', () => {
      const envelope = {
        ...createMockEnvelope(),
        forecast: null
      };

      const capacityResult = applyAddCapacity(envelope, 1);
      expect(capacityResult.original.forecastExtraDays).toBe(0);

      const scopeResult = applyRemoveScope(envelope, 20);
      expect(scopeResult.original.forecastExtraDays).toBe(0);

      const deadlineResult = applyExtendDeadline(envelope, 1);
      expect(deadlineResult.original.forecastExtraDays).toBe(0);
    });

    test('handles empty timeline', () => {
      const envelope = {
        ...createMockEnvelope(),
        timeline: []
      };

      const result = applyAddCapacity(envelope, 1);
      expect(result).toBeDefined();
      expect(result.result.feasibilityScore).toBeDefined();
    });

    test('preserves original envelope data', () => {
      const envelope = createMockEnvelope();
      const originalCapacity = envelope.totals.totalCapacity;

      applyAddCapacity(envelope, 2);

      // Original envelope should not be mutated
      expect(envelope.totals.totalCapacity).toBe(originalCapacity);
    });
  });
});
