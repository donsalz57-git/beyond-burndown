/**
 * Tests for scenarioCalculator utility functions
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
    forecast: {
      forecastDate: '2024-03-05T00:00:00Z',
      extraDays: 5,
      gap: 20,
      status: 'warning'
    }
  });

  describe('applyAddCapacity', () => {
    test('increases capacity by developer count', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 2);

      // 2 devs * 8 hours * 20 days = 320 additional capacity
      expect(result.totals.totalCapacity).toBeGreaterThan(envelope.totals.totalCapacity);
    });

    test('recalculates feasibility score', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 2);

      expect(result.feasibilityScore).toBeGreaterThan(envelope.feasibilityScore);
    });

    test('reduces extra days needed', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 2);

      expect(result.forecast.extraDays).toBeLessThan(envelope.forecast.extraDays);
    });

    test('handles zero developers', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 0);

      expect(result.feasibilityScore).toBe(envelope.feasibilityScore);
    });

    test('handles negative developer count', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, -1);

      // Should treat as 0 or handle gracefully
      expect(result.totals.totalCapacity).toBeLessThanOrEqual(envelope.totals.totalCapacity);
    });

    test('returns capacity delta', () => {
      const envelope = createMockEnvelope();
      const result = applyAddCapacity(envelope, 1);

      expect(result.delta).toBeDefined();
      expect(result.delta.capacityAdded).toBeGreaterThan(0);
    });
  });

  describe('applyRemoveScope', () => {
    test('reduces demand by issue hours', () => {
      const envelope = createMockEnvelope();
      const issues = [
        { key: 'TEST-1', remainingEstimate: 20 },
        { key: 'TEST-2', remainingEstimate: 15 }
      ];
      const result = applyRemoveScope(envelope, issues);

      // Should reduce demand by 35 hours
      expect(result.totals.totalDemand).toBe(envelope.totals.totalDemand - 35);
    });

    test('recalculates feasibility score', () => {
      const envelope = createMockEnvelope();
      const issues = [
        { key: 'TEST-1', remainingEstimate: 30 }
      ];
      const result = applyRemoveScope(envelope, issues);

      expect(result.feasibilityScore).toBeGreaterThan(envelope.feasibilityScore);
    });

    test('returns hours saved', () => {
      const envelope = createMockEnvelope();
      const issues = [
        { key: 'TEST-1', remainingEstimate: 20 },
        { key: 'TEST-2', remainingEstimate: 15 }
      ];
      const result = applyRemoveScope(envelope, issues);

      expect(result.delta.hoursSaved).toBe(35);
    });

    test('handles empty issue list', () => {
      const envelope = createMockEnvelope();
      const result = applyRemoveScope(envelope, []);

      expect(result.feasibilityScore).toBe(envelope.feasibilityScore);
    });

    test('handles issues without remaining estimate', () => {
      const envelope = createMockEnvelope();
      const issues = [
        { key: 'TEST-1', remainingEstimate: 0 },
        { key: 'TEST-2' } // No remainingEstimate
      ];
      const result = applyRemoveScope(envelope, issues);

      expect(result.totals.totalDemand).toBe(envelope.totals.totalDemand);
    });
  });

  describe('applyExtendDeadline', () => {
    test('increases total days', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 2);

      // 2 weeks = 10 business days
      expect(result.totals.totalDays).toBe(envelope.totals.totalDays + 10);
    });

    test('increases capacity proportionally', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 1);

      // 1 week = 5 days, capacity should increase by average daily capacity * 5
      const avgDailyCapacity = envelope.totals.totalCapacity / envelope.totals.totalDays;
      const expectedCapacity = envelope.totals.totalCapacity + (avgDailyCapacity * 5);
      expect(result.totals.totalCapacity).toBeCloseTo(expectedCapacity, 1);
    });

    test('recalculates feasibility score', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 2);

      expect(result.feasibilityScore).toBeGreaterThan(envelope.feasibilityScore);
    });

    test('reduces extra days needed', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 1);

      expect(result.forecast.extraDays).toBeLessThan(envelope.forecast.extraDays);
    });

    test('returns buffer gained', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 2);

      expect(result.delta.bufferGained).toBe(10); // 2 weeks = 10 business days
    });

    test('handles zero weeks', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 0);

      expect(result.feasibilityScore).toBe(envelope.feasibilityScore);
    });

    test('handles fractional weeks', () => {
      const envelope = createMockEnvelope();
      const result = applyExtendDeadline(envelope, 0.5);

      // 0.5 weeks = 2.5 days, should round appropriately
      expect(result.totals.totalDays).toBeGreaterThan(envelope.totals.totalDays);
    });
  });

  describe('edge cases', () => {
    test('handles envelope with zero capacity', () => {
      const envelope = {
        ...createMockEnvelope(),
        totals: { ...createMockEnvelope().totals, totalCapacity: 0, totalDays: 0 }
      };

      const result = applyAddCapacity(envelope, 1);
      expect(result.feasibilityScore).toBeDefined();
    });

    test('handles envelope with zero demand', () => {
      const envelope = {
        ...createMockEnvelope(),
        totals: { ...createMockEnvelope().totals, totalDemand: 0 }
      };

      const result = applyRemoveScope(envelope, []);
      expect(result.feasibilityScore).toBeDefined();
    });

    test('caps feasibility score at 100', () => {
      const envelope = {
        ...createMockEnvelope(),
        totals: {
          totalCapacity: 100,
          totalDemand: 50, // Demand much lower than capacity
          totalDays: 20
        }
      };

      const result = applyAddCapacity(envelope, 5);
      expect(result.feasibilityScore).toBeLessThanOrEqual(100);
    });

    test('floors feasibility score at 0', () => {
      const envelope = {
        ...createMockEnvelope(),
        totals: {
          totalCapacity: 10,
          totalDemand: 1000, // Demand much higher than capacity
          totalDays: 20
        }
      };

      const result = applyRemoveScope(envelope, [{ key: 'TEST-1', remainingEstimate: 5 }]);
      expect(result.feasibilityScore).toBeGreaterThanOrEqual(0);
    });
  });
});
