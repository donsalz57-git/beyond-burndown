/**
 * Unit tests for checkCompliance.js resolver
 */

import { checkCompliance } from '../src/resolvers/checkCompliance.js';

describe('checkCompliance', () => {
  // Helper to create dates
  const date = (str) => new Date(str + 'T00:00:00Z');
  const pastDate = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const futureDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  describe('basic functionality', () => {
    test('returns empty violations for empty issues', async () => {
      const result = await checkCompliance([]);

      expect(result.violations).toEqual([]);
      expect(result.summary.total).toBe(0);
    });

    test('returns correct structure', async () => {
      const result = await checkCompliance([]);

      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('byType');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('bySeverity');
    });
  });

  describe('missing dates check', () => {
    test('detects missing both dates', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: null,
          dueDate: null,
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      expect(result.violations.length).toBe(1);
      expect(result.violations[0].type).toBe('missing_dates');
      expect(result.violations[0].severity).toBe('warning');
      expect(result.violations[0].message).toContain('both');
    });

    test('detects missing start date only', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: null,
          dueDate: futureDate(),
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const dateViolations = result.violations.filter(v => v.type === 'missing_dates');
      expect(dateViolations.length).toBe(1);
      expect(dateViolations[0].severity).toBe('info');
      expect(dateViolations[0].message).toContain('start date');
    });

    test('detects missing due date only', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-20'),
          dueDate: null,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const dateViolations = result.violations.filter(v => v.type === 'missing_dates');
      expect(dateViolations.length).toBe(1);
      expect(dateViolations[0].severity).toBe('warning');
      expect(dateViolations[0].message).toContain('due date');
    });

    test('skips done issues for missing dates', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: null,
          dueDate: null,
          status: { category: 'done' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const dateViolations = result.violations.filter(v => v.type === 'missing_dates');
      expect(dateViolations.length).toBe(0);
    });

    test('no violation when both dates present', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const dateViolations = result.violations.filter(v => v.type === 'missing_dates');
      expect(dateViolations.length).toBe(0);
    });
  });

  describe('missing estimate check', () => {
    test('detects missing estimate', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 0,
          originalEstimate: 0,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const estimateViolations = result.violations.filter(v => v.type === 'missing_estimate');
      expect(estimateViolations.length).toBe(1);
      expect(estimateViolations[0].severity).toBe('warning');
    });

    test('skips epics for estimate check', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test epic',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 0,
          originalEstimate: 0,
          status: { category: 'in_progress' },
          issueType: { name: 'Epic' }
        }
      ];

      const result = await checkCompliance(issues);

      const estimateViolations = result.violations.filter(v => v.type === 'missing_estimate');
      expect(estimateViolations.length).toBe(0);
    });

    test('skips done issues for estimate check', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 0,
          originalEstimate: 0,
          status: { category: 'done' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const estimateViolations = result.violations.filter(v => v.type === 'missing_estimate');
      expect(estimateViolations.length).toBe(0);
    });

    test('no violation when original estimate present', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 0,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const estimateViolations = result.violations.filter(v => v.type === 'missing_estimate');
      expect(estimateViolations.length).toBe(0);
    });
  });

  describe('done with remaining check', () => {
    test('detects done issue with remaining estimate', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 4,
          originalEstimate: 8,
          status: { category: 'done', name: 'Done' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const doneViolations = result.violations.filter(v => v.type === 'done_with_remaining');
      expect(doneViolations.length).toBe(1);
      expect(doneViolations[0].severity).toBe('error');
      expect(doneViolations[0].message).toContain('4h remaining');
    });

    test('no violation when done with zero remaining', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 0,
          originalEstimate: 8,
          status: { category: 'done', name: 'Done' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const doneViolations = result.violations.filter(v => v.type === 'done_with_remaining');
      expect(doneViolations.length).toBe(0);
    });
  });

  describe('overdue check', () => {
    test('detects overdue issue', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-10'),
          dueDate: pastDate(),
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const overdueViolations = result.violations.filter(v => v.type === 'overdue');
      expect(overdueViolations.length).toBe(1);
      expect(overdueViolations[0].message).toContain('Overdue');
    });

    test('skips done issues for overdue check', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-10'),
          dueDate: pastDate(),
          remainingEstimate: 0,
          originalEstimate: 8,
          status: { category: 'done' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const overdueViolations = result.violations.filter(v => v.type === 'overdue');
      expect(overdueViolations.length).toBe(0);
    });

    test('no violation when due date is in future', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-20'),
          dueDate: futureDate(),
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const overdueViolations = result.violations.filter(v => v.type === 'overdue');
      expect(overdueViolations.length).toBe(0);
    });

    test('highly overdue issues have error severity', async () => {
      const veryPastDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-01'),
          dueDate: veryPastDate,
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const overdueViolations = result.violations.filter(v => v.type === 'overdue');
      expect(overdueViolations.length).toBe(1);
      expect(overdueViolations[0].severity).toBe('error');
    });
  });

  describe('child after parent check', () => {
    test('detects child due after parent', async () => {
      const issues = [
        {
          key: 'EPIC-1',
          summary: 'Parent epic',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          status: { category: 'in_progress' },
          issueType: { name: 'Epic' }
        },
        {
          key: 'TEST-1',
          summary: 'Child issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-30'), // After parent
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' },
          parent: { key: 'EPIC-1' }
        }
      ];

      const result = await checkCompliance(issues);

      const parentViolations = result.violations.filter(v => v.type === 'child_after_parent');
      expect(parentViolations.length).toBe(1);
      expect(parentViolations[0].severity).toBe('error');
      expect(parentViolations[0].message).toContain('EPIC-1');
    });

    test('no violation when child due before parent', async () => {
      const issues = [
        {
          key: 'EPIC-1',
          summary: 'Parent epic',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-30'),
          status: { category: 'in_progress' },
          issueType: { name: 'Epic' }
        },
        {
          key: 'TEST-1',
          summary: 'Child issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'), // Before parent
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' },
          parent: { key: 'EPIC-1' }
        }
      ];

      const result = await checkCompliance(issues);

      const parentViolations = result.violations.filter(v => v.type === 'child_after_parent');
      expect(parentViolations.length).toBe(0);
    });

    test('skips issues without parent', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Standalone issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-30'),
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const parentViolations = result.violations.filter(v => v.type === 'child_after_parent');
      expect(parentViolations.length).toBe(0);
    });
  });

  describe('dependency conflict check', () => {
    test('detects blocker finishing after issue starts', async () => {
      const issues = [
        {
          key: 'BLOCKER-1',
          summary: 'Blocker issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-28'), // Finishes after TEST-1 starts
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        },
        {
          key: 'TEST-1',
          summary: 'Blocked issue',
          startDate: date('2026-01-24'), // Starts before blocker finishes
          dueDate: date('2026-01-30'),
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' },
          links: [
            { type: 'blocked_by', targetKey: 'BLOCKER-1' }
          ]
        }
      ];

      const result = await checkCompliance(issues);

      const depViolations = result.violations.filter(v => v.type === 'dependency_conflict');
      expect(depViolations.length).toBe(1);
      expect(depViolations[0].severity).toBe('error');
      expect(depViolations[0].message).toContain('BLOCKER-1');
    });

    test('no violation when blocker finishes before issue starts', async () => {
      const issues = [
        {
          key: 'BLOCKER-1',
          summary: 'Blocker issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-22'), // Finishes before TEST-1 starts
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        },
        {
          key: 'TEST-1',
          summary: 'Blocked issue',
          startDate: date('2026-01-24'), // Starts after blocker finishes
          dueDate: date('2026-01-30'),
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' },
          links: [
            { type: 'blocked_by', targetKey: 'BLOCKER-1' }
          ]
        }
      ];

      const result = await checkCompliance(issues);

      const depViolations = result.violations.filter(v => v.type === 'dependency_conflict');
      expect(depViolations.length).toBe(0);
    });

    test('skips issues without links', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Test issue',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 8,
          originalEstimate: 8,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      const depViolations = result.violations.filter(v => v.type === 'dependency_conflict');
      expect(depViolations.length).toBe(0);
    });
  });

  describe('summary statistics', () => {
    test('counts violations by severity', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Missing dates',
          startDate: null,
          dueDate: null,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        },
        {
          key: 'TEST-2',
          summary: 'Done with remaining',
          startDate: date('2026-01-20'),
          dueDate: date('2026-01-24'),
          remainingEstimate: 4,
          originalEstimate: 8,
          status: { category: 'done', name: 'Done' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      expect(result.summary.bySeverity.error).toBeGreaterThanOrEqual(1);
      expect(result.summary.bySeverity.warning).toBeGreaterThanOrEqual(1);
    });

    test('groups violations by type', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Missing dates',
          startDate: null,
          dueDate: null,
          remainingEstimate: 0,
          originalEstimate: 0,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      expect(result.byType).toHaveProperty('missing_dates');
      expect(result.byType.missing_dates.length).toBeGreaterThan(0);
    });
  });

  describe('multiple issues', () => {
    test('checks all issues', async () => {
      const issues = [
        {
          key: 'TEST-1',
          summary: 'Issue 1',
          startDate: null,
          dueDate: null,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        },
        {
          key: 'TEST-2',
          summary: 'Issue 2',
          startDate: null,
          dueDate: null,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        },
        {
          key: 'TEST-3',
          summary: 'Issue 3',
          startDate: null,
          dueDate: null,
          status: { category: 'in_progress' },
          issueType: { name: 'Story' }
        }
      ];

      const result = await checkCompliance(issues);

      // Each issue should have a missing dates violation
      const dateViolations = result.violations.filter(v => v.type === 'missing_dates');
      expect(dateViolations.length).toBe(3);
    });
  });
});
