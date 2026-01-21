/**
 * Unit tests for buildDependencies.js resolver
 */

import { buildDependencies } from '../src/resolvers/buildDependencies.js';

describe('buildDependencies', () => {
  // Helper to create a date
  const date = (str) => new Date(str + 'T00:00:00Z');

  // Helper to create a mock issue
  const createIssue = (overrides = {}) => ({
    key: overrides.key || 'TEST-1',
    summary: overrides.summary || 'Test Issue',
    status: overrides.status || { name: 'In Progress', category: 'indeterminate' },
    dueDate: overrides.dueDate || null,
    startDate: overrides.startDate || null,
    links: overrides.links || []
  });

  describe('basic functionality', () => {
    test('returns correct structure for empty issues', async () => {
      const result = await buildDependencies([]);

      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('circularDependencies');
      expect(result).toHaveProperty('executionOrder');
      expect(result).toHaveProperty('hasCycle');
      expect(result).toHaveProperty('rootIssues');
      expect(result).toHaveProperty('leafIssues');
      expect(result).toHaveProperty('depthMap');
      expect(result).toHaveProperty('summary');
    });

    test('returns empty arrays for no issues', async () => {
      const result = await buildDependencies([]);

      expect(result.dependencies).toEqual([]);
      expect(result.circularDependencies).toEqual([]);
      expect(result.rootIssues).toEqual([]);
      expect(result.leafIssues).toEqual([]);
      expect(result.summary.totalDependencies).toBe(0);
    });

    test('summary contains correct counts', async () => {
      const result = await buildDependencies([]);

      expect(result.summary).toHaveProperty('totalDependencies');
      expect(result.summary).toHaveProperty('totalCircular');
      expect(result.summary).toHaveProperty('maxDepth');
      expect(result.summary).toHaveProperty('rootCount');
      expect(result.summary).toHaveProperty('leafCount');
    });
  });

  describe('dependency extraction', () => {
    test('extracts blocking dependencies', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          summary: 'Blocker',
          dueDate: date('2026-01-22'),
          links: [{ type: 'blocks', targetKey: 'TEST-2', targetSummary: 'Blocked' }]
        }),
        createIssue({
          key: 'TEST-2',
          summary: 'Blocked',
          startDate: date('2026-01-23'),
          links: [{ type: 'blocked_by', targetKey: 'TEST-1' }]
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0].from.key).toBe('TEST-1');
      expect(result.dependencies[0].to.key).toBe('TEST-2');
    });

    test('includes link type in dependency', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2', linkTypeName: 'blocks' }]
        }),
        createIssue({ key: 'TEST-2' })
      ];

      const result = await buildDependencies(issues);

      expect(result.dependencies[0].linkType).toBe('blocks');
    });

    test('handles issues without links', async () => {
      const issues = [
        createIssue({ key: 'TEST-1', links: undefined }),
        createIssue({ key: 'TEST-2', links: null }),
        createIssue({ key: 'TEST-3', links: [] })
      ];

      const result = await buildDependencies(issues);

      expect(result.dependencies).toHaveLength(0);
    });

    test('creates multiple dependencies for issue blocking multiple others', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [
            { type: 'blocks', targetKey: 'TEST-2' },
            { type: 'blocks', targetKey: 'TEST-3' }
          ]
        }),
        createIssue({ key: 'TEST-2' }),
        createIssue({ key: 'TEST-3' })
      ];

      const result = await buildDependencies(issues);

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies.map(d => d.to.key)).toContain('TEST-2');
      expect(result.dependencies.map(d => d.to.key)).toContain('TEST-3');
    });
  });

  describe('date conflict detection', () => {
    test('detects date conflict when blocker due date is after blocked start date', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          dueDate: date('2026-01-25'),
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          startDate: date('2026-01-20')
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.dependencies[0].hasConflict).toBe(true);
    });

    test('no conflict when blocker due date is before blocked start date', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          dueDate: date('2026-01-19'),
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          startDate: date('2026-01-20')
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.dependencies[0].hasConflict).toBe(false);
    });

    test('no conflict when dates are missing', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          dueDate: null,
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          startDate: null
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.dependencies[0].hasConflict).toBe(false);
    });
  });

  describe('root issues', () => {
    test('identifies root issues (no blockers)', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          summary: 'Root issue',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          summary: 'Blocked issue',
          links: [{ type: 'blocked_by', targetKey: 'TEST-1' }]
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.rootIssues).toHaveLength(1);
      expect(result.rootIssues[0].key).toBe('TEST-1');
    });

    test('excludes done issues from root issues', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          status: { name: 'Done', category: 'done' },
          links: []
        }),
        createIssue({
          key: 'TEST-2',
          status: { name: 'Open', category: 'new' },
          links: []
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.rootIssues).toHaveLength(1);
      expect(result.rootIssues[0].key).toBe('TEST-2');
    });

    test('includes status name in root issue data', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          summary: 'Root',
          status: { name: 'In Progress', category: 'indeterminate' }
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.rootIssues[0].status).toBe('In Progress');
    });
  });

  describe('leaf issues', () => {
    test('identifies leaf issues (not blocking anything)', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocked_by', targetKey: 'TEST-1' }]
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.leafIssues).toHaveLength(1);
      expect(result.leafIssues[0].key).toBe('TEST-2');
    });

    test('excludes done issues from leaf issues', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          status: { name: 'Done', category: 'done' },
          links: []
        }),
        createIssue({
          key: 'TEST-2',
          status: { name: 'Open', category: 'new' },
          links: []
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.leafIssues).toHaveLength(1);
      expect(result.leafIssues[0].key).toBe('TEST-2');
    });
  });

  describe('circular dependencies', () => {
    test('detects simple circular dependency', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocks', targetKey: 'TEST-1' }]
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.circularDependencies.length).toBeGreaterThan(0);
      expect(result.hasCycle).toBe(true);
    });

    test('detects longer circular dependency chain', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocks', targetKey: 'TEST-3' }]
        }),
        createIssue({
          key: 'TEST-3',
          links: [{ type: 'blocks', targetKey: 'TEST-1' }]
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.circularDependencies.length).toBeGreaterThan(0);
      expect(result.hasCycle).toBe(true);
    });

    test('returns no cycles for acyclic graph', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocks', targetKey: 'TEST-3' }]
        }),
        createIssue({
          key: 'TEST-3',
          links: []
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.circularDependencies).toHaveLength(0);
      expect(result.hasCycle).toBe(false);
    });

    test('circular dependency has description', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocks', targetKey: 'TEST-1' }]
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.circularDependencies[0]).toHaveProperty('description');
      expect(result.circularDependencies[0]).toHaveProperty('issues');
    });
  });

  describe('execution order', () => {
    test('returns topological order for acyclic graph', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocks', targetKey: 'TEST-3' }]
        }),
        createIssue({
          key: 'TEST-3',
          links: []
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.executionOrder).toHaveLength(3);
      // TEST-1 should come before TEST-2, TEST-2 before TEST-3
      const idx1 = result.executionOrder.indexOf('TEST-1');
      const idx2 = result.executionOrder.indexOf('TEST-2');
      const idx3 = result.executionOrder.indexOf('TEST-3');
      expect(idx1).toBeLessThan(idx2);
      expect(idx2).toBeLessThan(idx3);
    });

    test('returns empty execution order for cyclic graph', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocks', targetKey: 'TEST-1' }]
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.executionOrder).toEqual([]);
    });
  });

  describe('dependency depth', () => {
    test('calculates depth for linear chain', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocks', targetKey: 'TEST-3' }]
        }),
        createIssue({
          key: 'TEST-3',
          links: []
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.depthMap['TEST-1']).toBe(0);
      expect(result.depthMap['TEST-2']).toBe(1);
      expect(result.depthMap['TEST-3']).toBe(2);
      expect(result.summary.maxDepth).toBe(2);
    });

    test('calculates max depth for parallel chains', async () => {
      // TEST-1 -> TEST-3
      // TEST-2 -> TEST-3
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-3' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocks', targetKey: 'TEST-3' }]
        }),
        createIssue({
          key: 'TEST-3',
          links: []
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.depthMap['TEST-1']).toBe(0);
      expect(result.depthMap['TEST-2']).toBe(0);
      expect(result.depthMap['TEST-3']).toBe(1);
    });
  });

  describe('summary statistics', () => {
    test('counts total dependencies correctly', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [
            { type: 'blocks', targetKey: 'TEST-2' },
            { type: 'blocks', targetKey: 'TEST-3' }
          ]
        }),
        createIssue({ key: 'TEST-2' }),
        createIssue({ key: 'TEST-3' })
      ];

      const result = await buildDependencies(issues);

      expect(result.summary.totalDependencies).toBe(2);
    });

    test('counts circular dependencies', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocks', targetKey: 'TEST-1' }]
        })
      ];

      const result = await buildDependencies(issues);

      expect(result.summary.totalCircular).toBeGreaterThan(0);
    });

    test('counts root and leaf issues', async () => {
      const issues = [
        createIssue({
          key: 'TEST-1',
          links: [{ type: 'blocks', targetKey: 'TEST-2' }]
        }),
        createIssue({
          key: 'TEST-2',
          links: [{ type: 'blocked_by', targetKey: 'TEST-1' }]
        })
      ];

      const result = await buildDependencies(issues);

      // TEST-1 is root (no blockers), TEST-2 is leaf (not blocking anything)
      expect(result.summary.rootCount).toBe(1);
      expect(result.summary.leafCount).toBe(1);
    });
  });
});
