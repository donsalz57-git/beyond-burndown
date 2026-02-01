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
  });
});
