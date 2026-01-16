import {
  buildAdjacencyList,
  detectCircularDependencies,
  topologicalSort
} from '../utils/graphUtils';

/**
 * Build dependency graph and detect issues
 * @param {Array} demandIssues - Array of demand issues
 * @returns {Object} Dependency analysis results
 */
export async function buildDependencies(demandIssues) {
  // Extract all dependency relationships
  const dependencies = extractDependencies(demandIssues);

  // Build adjacency list for graph analysis
  const adjacency = buildAdjacencyList(demandIssues);

  // Detect circular dependencies
  const circularDependencies = detectCircularDependencies(adjacency);

  // Perform topological sort (for scheduling order)
  const { sorted: executionOrder, hasCycle } = topologicalSort(adjacency);

  // Identify root issues (no blockers)
  const rootIssues = findRootIssues(demandIssues);

  // Identify leaf issues (not blocking anything)
  const leafIssues = findLeafIssues(demandIssues, adjacency);

  // Calculate dependency depth for each issue
  const depthMap = calculateDependencyDepth(adjacency);

  return {
    dependencies,
    circularDependencies: circularDependencies.map(cycle => ({
      issues: cycle,
      description: `Circular dependency: ${cycle.join(' -> ')} -> ${cycle[0]}`
    })),
    executionOrder: hasCycle ? [] : executionOrder,
    hasCycle,
    rootIssues,
    leafIssues,
    depthMap,
    summary: {
      totalDependencies: dependencies.length,
      totalCircular: circularDependencies.length,
      maxDepth: Math.max(0, ...Object.values(depthMap)),
      rootCount: rootIssues.length,
      leafCount: leafIssues.length
    }
  };
}

/**
 * Extract all dependency relationships from issues
 * @param {Array} issues - Array of issues
 * @returns {Array} Dependency relationships
 */
function extractDependencies(issues) {
  const dependencies = [];
  const issueMap = new Map(issues.map(i => [i.key, i]));

  for (const issue of issues) {
    if (!issue.links) continue;

    for (const link of issue.links) {
      if (link.type === 'blocks') {
        const target = issueMap.get(link.targetKey);
        dependencies.push({
          from: {
            key: issue.key,
            summary: issue.summary,
            status: issue.status.name,
            dueDate: issue.dueDate?.toISOString() || null
          },
          to: {
            key: link.targetKey,
            summary: target?.summary || link.targetSummary,
            status: target?.status?.name || 'Unknown',
            startDate: target?.startDate?.toISOString() || null
          },
          linkType: link.linkTypeName,
          hasConflict: checkDateConflict(issue, target)
        });
      }
    }
  }

  return dependencies;
}

/**
 * Check if there's a date conflict between blocker and blocked issue
 * @param {Object} blocker - Blocking issue
 * @param {Object} blocked - Blocked issue
 * @returns {boolean} True if conflict exists
 */
function checkDateConflict(blocker, blocked) {
  if (!blocker?.dueDate || !blocked?.startDate) return false;
  return blocker.dueDate > blocked.startDate;
}

/**
 * Find root issues (issues with no blockers)
 * @param {Array} issues - Array of issues
 * @returns {Array} Root issue keys
 */
function findRootIssues(issues) {
  const roots = [];

  for (const issue of issues) {
    // Skip done issues
    if (issue.status.category === 'done') continue;

    const hasBlockers = issue.links?.some(link => link.type === 'blocked_by');
    if (!hasBlockers) {
      roots.push({
        key: issue.key,
        summary: issue.summary,
        status: issue.status.name
      });
    }
  }

  return roots;
}

/**
 * Find leaf issues (issues not blocking anything else)
 * @param {Array} issues - Array of issues
 * @param {Map} adjacency - Adjacency list
 * @returns {Array} Leaf issue keys
 */
function findLeafIssues(issues, adjacency) {
  const leaves = [];

  for (const issue of issues) {
    // Skip done issues
    if (issue.status.category === 'done') continue;

    const blockedIssues = adjacency.get(issue.key) || [];
    if (blockedIssues.length === 0) {
      leaves.push({
        key: issue.key,
        summary: issue.summary,
        status: issue.status.name
      });
    }
  }

  return leaves;
}

/**
 * Calculate dependency depth for each issue
 * Depth = longest path from a root to this issue
 * @param {Map} adjacency - Adjacency list
 * @returns {Object} Map of issue key to depth
 */
function calculateDependencyDepth(adjacency) {
  const depth = {};
  const inDegree = new Map();

  // Initialize
  for (const node of adjacency.keys()) {
    depth[node] = 0;
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

  // BFS to calculate depths
  const queue = [];
  for (const [node, degree] of inDegree) {
    if (degree === 0) {
      queue.push(node);
      depth[node] = 0;
    }
  }

  while (queue.length > 0) {
    const node = queue.shift();
    const neighbors = adjacency.get(node) || [];

    for (const neighbor of neighbors) {
      if (!adjacency.has(neighbor)) continue;

      // Update depth to be max of current depth or parent depth + 1
      depth[neighbor] = Math.max(depth[neighbor], depth[node] + 1);

      const newDegree = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return depth;
}
