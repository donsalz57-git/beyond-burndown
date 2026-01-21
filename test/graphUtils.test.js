/**
 * Unit tests for graphUtils.js utility functions
 */

import {
  buildAdjacencyList,
  detectCircularDependencies,
  getTransitiveDependencies,
  topologicalSort
} from '../src/utils/graphUtils.js';

describe('graphUtils utilities', () => {
  describe('buildAdjacencyList', () => {
    test('builds empty map for issues without links', () => {
      const issues = [
        { key: 'PROJ-1' },
        { key: 'PROJ-2' }
      ];
      const adjacency = buildAdjacencyList(issues);
      expect(adjacency.size).toBe(2);
      expect(adjacency.get('PROJ-1')).toEqual([]);
      expect(adjacency.get('PROJ-2')).toEqual([]);
    });

    test('builds adjacency list with blocking relationships', () => {
      const issues = [
        {
          key: 'PROJ-1',
          links: [{ type: 'blocks', targetKey: 'PROJ-2' }]
        },
        { key: 'PROJ-2' }
      ];
      const adjacency = buildAdjacencyList(issues);
      expect(adjacency.get('PROJ-1')).toEqual(['PROJ-2']);
      expect(adjacency.get('PROJ-2')).toEqual([]);
    });

    test('ignores non-blocking link types', () => {
      const issues = [
        {
          key: 'PROJ-1',
          links: [
            { type: 'relates to', targetKey: 'PROJ-2' },
            { type: 'duplicates', targetKey: 'PROJ-3' }
          ]
        },
        { key: 'PROJ-2' },
        { key: 'PROJ-3' }
      ];
      const adjacency = buildAdjacencyList(issues);
      expect(adjacency.get('PROJ-1')).toEqual([]);
    });

    test('handles multiple blocking relationships', () => {
      const issues = [
        {
          key: 'PROJ-1',
          links: [
            { type: 'blocks', targetKey: 'PROJ-2' },
            { type: 'blocks', targetKey: 'PROJ-3' }
          ]
        },
        { key: 'PROJ-2' },
        { key: 'PROJ-3' }
      ];
      const adjacency = buildAdjacencyList(issues);
      expect(adjacency.get('PROJ-1')).toEqual(['PROJ-2', 'PROJ-3']);
    });

    test('handles issues with null links', () => {
      const issues = [
        { key: 'PROJ-1', links: null },
        { key: 'PROJ-2' }
      ];
      const adjacency = buildAdjacencyList(issues);
      expect(adjacency.get('PROJ-1')).toEqual([]);
    });
  });

  describe('detectCircularDependencies', () => {
    test('returns empty array for no cycles', () => {
      const adjacency = new Map([
        ['A', ['B']],
        ['B', ['C']],
        ['C', []]
      ]);
      const cycles = detectCircularDependencies(adjacency);
      expect(cycles).toEqual([]);
    });

    test('detects simple two-node cycle', () => {
      const adjacency = new Map([
        ['A', ['B']],
        ['B', ['A']]
      ]);
      const cycles = detectCircularDependencies(adjacency);
      expect(cycles.length).toBe(1);
      expect(cycles[0]).toContain('A');
      expect(cycles[0]).toContain('B');
    });

    test('detects three-node cycle', () => {
      const adjacency = new Map([
        ['A', ['B']],
        ['B', ['C']],
        ['C', ['A']]
      ]);
      const cycles = detectCircularDependencies(adjacency);
      expect(cycles.length).toBe(1);
      expect(cycles[0].length).toBe(3);
    });

    test('handles disconnected components', () => {
      const adjacency = new Map([
        ['A', ['B']],
        ['B', []],
        ['C', ['D']],
        ['D', []]
      ]);
      const cycles = detectCircularDependencies(adjacency);
      expect(cycles).toEqual([]);
    });

    test('skips external references not in adjacency', () => {
      const adjacency = new Map([
        ['A', ['B', 'EXTERNAL']],
        ['B', []]
      ]);
      const cycles = detectCircularDependencies(adjacency);
      expect(cycles).toEqual([]);
    });

    test('handles empty graph', () => {
      const adjacency = new Map();
      const cycles = detectCircularDependencies(adjacency);
      expect(cycles).toEqual([]);
    });
  });

  describe('getTransitiveDependencies', () => {
    test('returns direct dependencies', () => {
      const adjacency = new Map([
        ['A', ['B', 'C']],
        ['B', []],
        ['C', []]
      ]);
      const deps = getTransitiveDependencies('A', adjacency);
      expect(deps.has('B')).toBe(true);
      expect(deps.has('C')).toBe(true);
      expect(deps.has('A')).toBe(false); // Should not include self
    });

    test('returns transitive dependencies', () => {
      const adjacency = new Map([
        ['A', ['B']],
        ['B', ['C']],
        ['C', ['D']],
        ['D', []]
      ]);
      const deps = getTransitiveDependencies('A', adjacency);
      expect(deps.has('B')).toBe(true);
      expect(deps.has('C')).toBe(true);
      expect(deps.has('D')).toBe(true);
    });

    test('returns empty set for leaf node', () => {
      const adjacency = new Map([
        ['A', ['B']],
        ['B', []]
      ]);
      const deps = getTransitiveDependencies('B', adjacency);
      expect(deps.size).toBe(0);
    });

    test('handles cycles without infinite loop', () => {
      const adjacency = new Map([
        ['A', ['B']],
        ['B', ['A']]
      ]);
      const deps = getTransitiveDependencies('A', adjacency);
      expect(deps.has('B')).toBe(true);
      expect(deps.size).toBe(1);
    });
  });

  describe('topologicalSort', () => {
    test('sorts linear dependency chain', () => {
      const adjacency = new Map([
        ['A', ['B']],
        ['B', ['C']],
        ['C', []]
      ]);
      const result = topologicalSort(adjacency);
      expect(result.hasCycle).toBe(false);
      expect(result.sorted.indexOf('A')).toBeLessThan(result.sorted.indexOf('B'));
      expect(result.sorted.indexOf('B')).toBeLessThan(result.sorted.indexOf('C'));
    });

    test('detects cycle and returns partial sort', () => {
      const adjacency = new Map([
        ['A', ['B']],
        ['B', ['A']]
      ]);
      const result = topologicalSort(adjacency);
      expect(result.hasCycle).toBe(true);
      expect(result.sorted.length).toBeLessThan(2);
    });

    test('handles independent nodes', () => {
      const adjacency = new Map([
        ['A', []],
        ['B', []],
        ['C', []]
      ]);
      const result = topologicalSort(adjacency);
      expect(result.hasCycle).toBe(false);
      expect(result.sorted.length).toBe(3);
    });

    test('handles complex DAG', () => {
      const adjacency = new Map([
        ['A', ['B', 'C']],
        ['B', ['D']],
        ['C', ['D']],
        ['D', []]
      ]);
      const result = topologicalSort(adjacency);
      expect(result.hasCycle).toBe(false);
      expect(result.sorted.indexOf('A')).toBeLessThan(result.sorted.indexOf('B'));
      expect(result.sorted.indexOf('A')).toBeLessThan(result.sorted.indexOf('C'));
      expect(result.sorted.indexOf('B')).toBeLessThan(result.sorted.indexOf('D'));
      expect(result.sorted.indexOf('C')).toBeLessThan(result.sorted.indexOf('D'));
    });

    test('handles empty graph', () => {
      const adjacency = new Map();
      const result = topologicalSort(adjacency);
      expect(result.hasCycle).toBe(false);
      expect(result.sorted).toEqual([]);
    });
  });
});
