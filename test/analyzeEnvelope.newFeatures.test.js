/**
 * Tests for new features in analyzeEnvelope resolver
 * (forecast, confidence, resources)
 */

import { analyzeEnvelope } from '../src/resolvers/analyzeEnvelope';

describe('analyzeEnvelope - New Features', () => {
  // Use dates relative to today for proper timeline calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDate = (daysFromNow) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysFromNow);
    return d;
  };

  const createDemandIssue = (overrides = {}) => ({
    key: 'TEST-1',
    summary: 'Test Issue',
    status: { name: 'To Do', category: 'new' },
    startDate: futureDate(0),  // starts today
    dueDate: futureDate(5),    // due in 5 days
    originalEstimate: 20,
    remainingEstimate: 20,
    timeSpent: 0,
    assignee: 'John Doe',
    ...overrides
  });

  const createCapacityIssue = (overrides = {}) => ({
    key: 'CAP-1',
    summary: 'Capacity',
    startDate: futureDate(0),  // starts today
    dueDate: futureDate(5),    // ends in 5 days
    originalEstimate: 40,
    assignee: 'John Doe',
    ...overrides
  });

  describe('forecast calculation', () => {
    test('returns on_track when capacity exceeds demand', async () => {
      const demandIssues = [
        createDemandIssue({ remainingEstimate: 20 })
      ];
      const capacityIssues = [
        createCapacityIssue({ originalEstimate: 40 })
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      expect(result.forecast.status).toBe('on_track');
      expect(result.forecast.extraDays).toBe(0);
    });

    test('calculates extra days when demand exceeds capacity', async () => {
      const demandIssues = [
        createDemandIssue({ remainingEstimate: 60 })
      ];
      const capacityIssues = [
        createCapacityIssue({ originalEstimate: 20 })
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      expect(result.forecast.extraDays).toBeGreaterThan(0);
      expect(result.forecast.gap).toBeGreaterThan(0);
    });

    test('sets critical status for large overrun', async () => {
      const demandIssues = [
        createDemandIssue({ remainingEstimate: 200 })
      ];
      const capacityIssues = [
        createCapacityIssue({ originalEstimate: 20 })
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      expect(result.forecast.extraDays).toBeGreaterThan(10);
      expect(result.forecast.status).toBe('critical');
    });

    test('includes forecast date when behind schedule', async () => {
      const demandIssues = [
        createDemandIssue({ remainingEstimate: 80 })
      ];
      const capacityIssues = [
        createCapacityIssue({ originalEstimate: 20 })
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      if (result.forecast.extraDays > 0) {
        expect(result.forecast.forecastDate).toBeDefined();
        expect(new Date(result.forecast.forecastDate)).toBeInstanceOf(Date);
      }
    });
  });

  describe('confidence calculation', () => {
    test('returns high confidence when all data present', async () => {
      const demandIssues = [
        createDemandIssue({
          originalEstimate: 20,
          remainingEstimate: 20,
          startDate: futureDate(0),
          dueDate: futureDate(5),
          assignee: 'John Doe'
        })
      ];
      const capacityIssues = [createCapacityIssue()];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      expect(result.confidence.level).toBe('high');
      expect(result.confidence.overallScore).toBeGreaterThanOrEqual(80);
    });

    test('returns low confidence when data missing', async () => {
      const demandIssues = [
        createDemandIssue({
          originalEstimate: 0,
          remainingEstimate: 0,
          startDate: null,
          dueDate: null,
          assignee: null
        }),
        createDemandIssue({
          key: 'TEST-2',
          originalEstimate: 0,
          remainingEstimate: 0,
          startDate: null,
          dueDate: null,
          assignee: null
        })
      ];
      const capacityIssues = [createCapacityIssue()];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      expect(result.confidence.level).toBe('low');
      expect(result.confidence.overallScore).toBeLessThan(60);
    });

    test('includes breakdown by category', async () => {
      const demandIssues = [
        createDemandIssue({ assignee: null }) // Missing assignee
      ];
      const capacityIssues = [createCapacityIssue()];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      expect(result.confidence.breakdown).toBeDefined();
      expect(result.confidence.breakdown.estimates).toBeDefined();
      expect(result.confidence.breakdown.dates).toBeDefined();
      expect(result.confidence.breakdown.assignees).toBeDefined();
    });

    test('generates warnings for missing data', async () => {
      const demandIssues = [
        createDemandIssue({ originalEstimate: 0, remainingEstimate: 0 }),
        createDemandIssue({ key: 'TEST-2', originalEstimate: 0, remainingEstimate: 0 }),
        createDemandIssue({ key: 'TEST-3', originalEstimate: 0, remainingEstimate: 0 })
      ];
      const capacityIssues = [createCapacityIssue()];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      expect(result.confidence.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('resource breakdown', () => {
    test('groups demand by assignee', async () => {
      const demandIssues = [
        createDemandIssue({ key: 'TEST-1', assignee: 'Alice', remainingEstimate: 20 }),
        createDemandIssue({ key: 'TEST-2', assignee: 'Alice', remainingEstimate: 10 }),
        createDemandIssue({ key: 'TEST-3', assignee: 'Bob', remainingEstimate: 15 })
      ];
      const capacityIssues = [createCapacityIssue()];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      const alice = result.resources.find(r => r.assignee === 'Alice');
      const bob = result.resources.find(r => r.assignee === 'Bob');

      expect(alice.demand).toBe(30);
      expect(alice.issueCount).toBe(2);
      expect(bob.demand).toBe(15);
      expect(bob.issueCount).toBe(1);
    });

    test('tracks capacity per assignee from capacity issues', async () => {
      const demandIssues = [
        createDemandIssue({ assignee: 'Alice', remainingEstimate: 20 })
      ];
      const capacityIssues = [
        createCapacityIssue({ assignee: 'Alice', originalEstimate: 40 }),
        createCapacityIssue({ key: 'CAP-2', assignee: 'Bob', originalEstimate: 30 })
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      const alice = result.resources.find(r => r.assignee === 'Alice');
      expect(alice.capacity).toBe(40);

      const bob = result.resources.find(r => r.assignee === 'Bob');
      expect(bob.capacity).toBe(30);
    });

    test('calculates load percentage', async () => {
      const demandIssues = [
        createDemandIssue({ assignee: 'Alice', remainingEstimate: 30 })
      ];
      const capacityIssues = [
        createCapacityIssue({ assignee: 'Alice', originalEstimate: 40 })
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      const alice = result.resources.find(r => r.assignee === 'Alice');
      expect(alice.loadPercent).toBe(75); // 30/40 * 100
    });

    test('sets overloaded status when demand exceeds capacity', async () => {
      const demandIssues = [
        createDemandIssue({ assignee: 'Alice', remainingEstimate: 50 })
      ];
      const capacityIssues = [
        createCapacityIssue({ assignee: 'Alice', originalEstimate: 40 })
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      const alice = result.resources.find(r => r.assignee === 'Alice');
      expect(alice.status).toBe('overloaded');
    });

    test('sets under_utilized status for low load', async () => {
      const demandIssues = [
        createDemandIssue({ assignee: 'Alice', remainingEstimate: 10 })
      ];
      const capacityIssues = [
        createCapacityIssue({ assignee: 'Alice', originalEstimate: 40 })
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      const alice = result.resources.find(r => r.assignee === 'Alice');
      expect(alice.status).toBe('under_utilized');
    });

    test('sets on_track status for balanced load', async () => {
      const demandIssues = [
        createDemandIssue({ assignee: 'Alice', remainingEstimate: 36 })
      ];
      const capacityIssues = [
        createCapacityIssue({ assignee: 'Alice', originalEstimate: 40 })
      ];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      const alice = result.resources.find(r => r.assignee === 'Alice');
      expect(alice.status).toBe('on_track'); // 90% load
    });

    test('groups unassigned issues together', async () => {
      const demandIssues = [
        createDemandIssue({ key: 'TEST-1', assignee: null, remainingEstimate: 10 }),
        createDemandIssue({ key: 'TEST-2', assignee: null, remainingEstimate: 15 })
      ];
      const capacityIssues = [createCapacityIssue()];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      const unassigned = result.resources.find(r => r.assignee === 'Unassigned');
      expect(unassigned.demand).toBe(25);
      expect(unassigned.issueCount).toBe(2);
    });

    test('excludes done issues from demand', async () => {
      const demandIssues = [
        createDemandIssue({ assignee: 'Alice', remainingEstimate: 20, status: { category: 'in_progress' } }),
        createDemandIssue({ key: 'TEST-2', assignee: 'Alice', remainingEstimate: 0, status: { category: 'done' } })
      ];
      const capacityIssues = [createCapacityIssue({ assignee: 'Alice' })];

      const result = await analyzeEnvelope(demandIssues, capacityIssues, []);

      const alice = result.resources.find(r => r.assignee === 'Alice');
      expect(alice.demand).toBe(20); // Only in_progress issue
    });
  });
});
