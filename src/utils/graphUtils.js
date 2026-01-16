/**
 * Graph utilities for dependency analysis
 * Uses Tarjan's algorithm for cycle detection
 */

/**
 * Build an adjacency list from issue dependencies
 * @param {Array} issues - Array of issues with links
 * @returns {Map<string, string[]>} Adjacency list (issueKey -> blocked issue keys)
 */
export function buildAdjacencyList(issues) {
  const adjacency = new Map();

  // Initialize all issues in the map
  for (const issue of issues) {
    adjacency.set(issue.key, []);
  }

  // Add edges based on blocking relationships
  for (const issue of issues) {
    if (!issue.links) continue;

    for (const link of issue.links) {
      if (link.type === 'blocks' && link.targetKey) {
        // This issue blocks targetKey
        const blockers = adjacency.get(issue.key) || [];
        blockers.push(link.targetKey);
        adjacency.set(issue.key, blockers);
      }
    }
  }

  return adjacency;
}

/**
 * Detect circular dependencies using Tarjan's algorithm
 * @param {Map<string, string[]>} adjacency - Adjacency list
 * @returns {string[][]} Array of cycles (each cycle is array of issue keys)
 */
export function detectCircularDependencies(adjacency) {
  const index = new Map();
  const lowlink = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];
  let currentIndex = 0;

  function strongConnect(node) {
    index.set(node, currentIndex);
    lowlink.set(node, currentIndex);
    currentIndex++;
    stack.push(node);
    onStack.add(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!adjacency.has(neighbor)) continue; // Skip external references

      if (!index.has(neighbor)) {
        strongConnect(neighbor);
        lowlink.set(node, Math.min(lowlink.get(node), lowlink.get(neighbor)));
      } else if (onStack.has(neighbor)) {
        lowlink.set(node, Math.min(lowlink.get(node), index.get(neighbor)));
      }
    }

    // If node is a root of an SCC
    if (lowlink.get(node) === index.get(node)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        scc.push(w);
      } while (w !== node);

      // Only report cycles with more than one node
      if (scc.length > 1) {
        cycles.push(scc.reverse());
      }
    }
  }

  for (const node of adjacency.keys()) {
    if (!index.has(node)) {
      strongConnect(node);
    }
  }

  return cycles;
}

/**
 * Get all dependencies for an issue (transitive closure)
 * @param {string} issueKey - Starting issue key
 * @param {Map<string, string[]>} adjacency - Adjacency list
 * @returns {Set<string>} All issues that the given issue blocks (directly or transitively)
 */
export function getTransitiveDependencies(issueKey, adjacency) {
  const visited = new Set();
  const queue = [issueKey];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  visited.delete(issueKey); // Remove self from dependencies
  return visited;
}

/**
 * Perform topological sort on the dependency graph
 * @param {Map<string, string[]>} adjacency - Adjacency list
 * @returns {{ sorted: string[], hasCycle: boolean }} Sorted keys or partial sort if cycle exists
 */
export function topologicalSort(adjacency) {
  const inDegree = new Map();
  const sorted = [];

  // Initialize in-degrees
  for (const node of adjacency.keys()) {
    inDegree.set(node, 0);
  }

  // Calculate in-degrees
  for (const [, neighbors] of adjacency) {
    for (const neighbor of neighbors) {
      if (adjacency.has(neighbor)) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }
  }

  // Queue nodes with in-degree 0
  const queue = [];
  for (const [node, degree] of inDegree) {
    if (degree === 0) {
      queue.push(node);
    }
  }

  // Process queue
  while (queue.length > 0) {
    const node = queue.shift();
    sorted.push(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!adjacency.has(neighbor)) continue;

      const newDegree = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return {
    sorted,
    hasCycle: sorted.length !== adjacency.size
  };
}
