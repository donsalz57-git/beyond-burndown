/**
 * Forge Bridge Mock for E2E Testing
 *
 * This module provides mock implementations of the Forge bridge
 * for testing the gadget UI without a live Jira connection.
 */

/**
 * Create a mock data payload for testing
 */
function createMockData(overrides = {}) {
  const defaultData = {
    envelope: {
      timeline: [
        { date: '2024-01-15', displayDate: 'Jan 15', capacity: 8, demand: 6, cumulativeCapacity: 8, cumulativeDemand: 6, isOverloaded: false },
        { date: '2024-01-16', displayDate: 'Jan 16', capacity: 8, demand: 7, cumulativeCapacity: 16, cumulativeDemand: 13, isOverloaded: false },
        { date: '2024-01-17', displayDate: 'Jan 17', capacity: 8, demand: 10, cumulativeCapacity: 24, cumulativeDemand: 23, isOverloaded: false },
      ],
      feasibilityScore: 85,
      totals: {
        totalCapacity: 160,
        totalDemand: 120,
        totalTimeSpent: 40,
        totalDays: 20
      },
      resources: [
        { assignee: 'Alice', capacity: 80, demand: 60, loadPercent: 75, status: 'healthy' },
        { assignee: 'Bob', capacity: 80, demand: 60, loadPercent: 75, status: 'healthy' }
      ],
      confidence: {
        overallScore: 85,
        level: 'high',
        breakdown: {
          estimates: { percent: 90 },
          dates: { percent: 80 },
          assignees: { percent: 85 }
        }
      },
      forecast: {
        extraDays: 0,
        status: 'on_track',
        message: 'On track to complete by deadline'
      }
    },
    compliance: {
      violations: [],
      byType: {},
      summary: {
        total: 0,
        bySeverity: { error: 0, warning: 0, info: 0 }
      }
    },
    dependencies: {
      dependencies: [],
      circularDependencies: [],
      rootIssues: [],
      leafIssues: [],
      summary: {
        totalDependencies: 0,
        totalCircular: 0,
        rootCount: 0,
        maxDepth: 0
      }
    },
    scope: {
      scopeTimeline: [],
      totals: { added: 0, removed: 0, net: 0 },
      trend: { direction: 'stable', velocity: 0 },
      alerts: []
    },
    statusReport: {
      generatedAt: new Date().toISOString(),
      headline: {
        feasibility: { score: 85, status: 'green' },
        forecast: { extraDays: 0, status: 'on_track' },
        capacityUtilization: { percent: 75, status: 'healthy' },
        completion: { percent: 33 }
      },
      schedule: {
        deadline: '2024-03-01',
        forecast: '2024-02-28',
        buffer: 1,
        bufferLabel: '1 day buffer'
      },
      capacity: {
        available: 160,
        demand: 120,
        timeSpent: 40,
        gap: -40
      },
      progress: {
        closedCount: 10,
        closedHours: 40,
        remainingCount: 20,
        remainingHours: 80,
        completionPercent: 33
      },
      risks: {
        overloadedPeriods: { count: 0 },
        complianceViolations: { count: 0 },
        circularDependencies: { count: 0 },
        overdueIssues: { count: 0 }
      },
      decisions: []
    },
    summary: {
      totalDemandIssues: 30,
      feasibilityScore: 85,
      totalViolations: 0,
      circularDependencies: 0
    }
  };

  return deepMerge(defaultData, overrides);
}

/**
 * Create a mock config
 */
function createMockConfig(overrides = {}) {
  return {
    demandJql: 'project = TEST',
    capacityJql: 'project = TEST AND type = Capacity',
    capacityMode: 'manual',
    capacityType: 'team',
    teamHours: 160,
    teamMembers: [],
    targetDate: null,
    ...overrides
  };
}

/**
 * Deep merge utility
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

module.exports = {
  createMockData,
  createMockConfig,
  deepMerge
};
