/**
 * Tests for generateStatusReport resolver
 */

import { generateStatusReport } from '../src/resolvers/generateStatusReport';

describe('generateStatusReport', () => {
  const createMockEnvelope = (overrides = {}) => ({
    feasibilityScore: 75,
    rangeEnd: '2024-02-15T00:00:00Z',
    overloadedPeriods: [],
    totals: {
      totalCapacity: 100,
      totalDemand: 80,
      totalTimeSpent: 40,
      totalOriginalEstimate: 100,
      totalDays: 20
    },
    forecast: {
      forecastDate: null,
      extraDays: 0,
      status: 'on_track',
      message: 'On track'
    },
    confidence: {
      overallScore: 85,
      level: 'high',
      breakdown: {
        estimates: { count: 8, total: 10, percent: 80 },
        dates: { count: 9, total: 10, percent: 90 },
        assignees: { count: 9, total: 10, percent: 90 }
      }
    },
    ...overrides
  });

  const createMockCompliance = (overrides = {}) => ({
    violations: [],
    summary: { total: 0, bySeverity: { error: 0, warning: 0, info: 0 } },
    byType: {},
    ...overrides
  });

  const createMockDependencies = (overrides = {}) => ({
    circularDependencies: [],
    dependencies: [],
    ...overrides
  });

  const createMockIssues = () => [
    { key: 'TEST-1', status: { category: 'done' }, timeSpent: 10, originalEstimate: 10, remainingEstimate: 0 },
    { key: 'TEST-2', status: { category: 'in_progress' }, timeSpent: 5, originalEstimate: 20, remainingEstimate: 15 },
    { key: 'TEST-3', status: { category: 'new' }, timeSpent: 0, originalEstimate: 30, remainingEstimate: 30 }
  ];

  test('generates report with timestamp', () => {
    const result = generateStatusReport(
      createMockEnvelope(),
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    expect(result.generatedAt).toBeDefined();
    expect(new Date(result.generatedAt)).toBeInstanceOf(Date);
  });

  test('includes headline metrics', () => {
    const envelope = createMockEnvelope({ feasibilityScore: 82 });
    const result = generateStatusReport(
      envelope,
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    expect(result.headline.feasibility.score).toBe(82);
    expect(result.headline.feasibility.status).toBe('green');
  });

  test('sets correct status for low feasibility', () => {
    const envelope = createMockEnvelope({ feasibilityScore: 45 });
    const result = generateStatusReport(
      envelope,
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    expect(result.headline.feasibility.status).toBe('red');
  });

  test('sets correct status for medium feasibility', () => {
    const envelope = createMockEnvelope({ feasibilityScore: 65 });
    const result = generateStatusReport(
      envelope,
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    expect(result.headline.feasibility.status).toBe('yellow');
  });

  test('includes forecast information', () => {
    const envelope = createMockEnvelope({
      forecast: {
        forecastDate: '2024-02-20T00:00:00Z',
        extraDays: 5,
        status: 'warning',
        message: '5 days late'
      }
    });
    const result = generateStatusReport(
      envelope,
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    expect(result.headline.forecast.extraDays).toBe(5);
    expect(result.headline.forecast.status).toBe('warning');
  });

  test('calculates capacity utilization', () => {
    const envelope = createMockEnvelope({
      totals: { totalCapacity: 100, totalDemand: 90, totalTimeSpent: 90, totalOriginalEstimate: 100 }
    });
    const result = generateStatusReport(
      envelope,
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    // Utilization is timeSpent / capacity
    expect(result.headline.capacityUtilization.percent).toBe(90);
  });

  test('includes schedule section', () => {
    const envelope = createMockEnvelope({ rangeEnd: '2024-02-28T00:00:00Z' });
    const result = generateStatusReport(
      envelope,
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    expect(result.schedule.deadline).toBe('2024-02-28T00:00:00Z');
  });

  test('includes capacity breakdown', () => {
    const envelope = createMockEnvelope({
      totals: { totalCapacity: 100, totalDemand: 80, totalTimeSpent: 50, totalOriginalEstimate: 100 }
    });
    const result = generateStatusReport(
      envelope,
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    expect(result.capacity.available).toBe(100);
    expect(result.capacity.demand).toBe(80);
    expect(result.capacity.timeSpent).toBe(50);
    expect(result.capacity.gap).toBe(-20); // demand - capacity
  });

  test('calculates progress from issues', () => {
    const issues = [
      { key: 'TEST-1', status: { category: 'done' }, timeSpent: 10, originalEstimate: 10, remainingEstimate: 0 },
      { key: 'TEST-2', status: { category: 'done' }, timeSpent: 20, originalEstimate: 20, remainingEstimate: 0 },
      { key: 'TEST-3', status: { category: 'in_progress' }, timeSpent: 5, originalEstimate: 30, remainingEstimate: 25 }
    ];
    const result = generateStatusReport(
      createMockEnvelope(),
      createMockCompliance(),
      createMockDependencies(),
      issues
    );

    expect(result.progress.closedCount).toBe(2);
    expect(result.progress.remainingCount).toBe(1);
  });

  test('includes risk counts', () => {
    const envelope = createMockEnvelope({
      overloadedPeriods: [
        { startDate: '2024-01-15', endDate: '2024-01-17', days: 3, maxOverload: 10 }
      ]
    });
    const compliance = createMockCompliance({
      summary: { total: 5, bySeverity: { error: 2, warning: 2, info: 1 } },
      byType: { overdue: [{ issueKey: 'TEST-1' }, { issueKey: 'TEST-2' }] }
    });
    const dependencies = createMockDependencies({
      circularDependencies: [{ issues: ['A', 'B'], description: 'A -> B -> A' }]
    });

    const result = generateStatusReport(
      envelope,
      compliance,
      dependencies,
      createMockIssues()
    );

    expect(result.risks.overloadedPeriods.count).toBe(1);
    expect(result.risks.complianceViolations.count).toBe(5);
    expect(result.risks.circularDependencies.count).toBe(1);
    expect(result.risks.overdueIssues.count).toBe(2);
  });

  test('generates decision for critical feasibility', () => {
    const envelope = createMockEnvelope({
      feasibilityScore: 40,
      totals: { totalCapacity: 50, totalDemand: 100, totalTimeSpent: 20, totalOriginalEstimate: 100 }
    });
    const result = generateStatusReport(
      envelope,
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    const criticalDecision = result.decisions.find(d => d.title === 'Critical Capacity Shortfall');
    expect(criticalDecision).toBeDefined();
    expect(criticalDecision.priority).toBe('high');
  });

  test('generates decision for circular dependencies', () => {
    const dependencies = createMockDependencies({
      circularDependencies: [{ issues: ['A', 'B'], description: 'A -> B -> A' }]
    });
    const result = generateStatusReport(
      createMockEnvelope(),
      createMockCompliance(),
      dependencies,
      createMockIssues()
    );

    const circularDecision = result.decisions.find(d => d.title === 'Circular Dependencies Detected');
    expect(circularDecision).toBeDefined();
  });

  test('generates decision for low confidence', () => {
    const envelope = createMockEnvelope({
      confidence: { overallScore: 40, level: 'low', breakdown: {} }
    });
    const result = generateStatusReport(
      envelope,
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    const confidenceDecision = result.decisions.find(d => d.title === 'Low Data Confidence');
    expect(confidenceDecision).toBeDefined();
  });

  test('includes confidence data in report', () => {
    const envelope = createMockEnvelope({
      confidence: { overallScore: 75, level: 'medium', breakdown: {} }
    });
    const result = generateStatusReport(
      envelope,
      createMockCompliance(),
      createMockDependencies(),
      createMockIssues()
    );

    expect(result.confidence.overallScore).toBe(75);
    expect(result.confidence.level).toBe('medium');
  });
});
