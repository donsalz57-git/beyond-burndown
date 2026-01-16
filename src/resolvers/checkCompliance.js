import { isPast, getToday, daysDifference } from '../utils/dateUtils';

/**
 * Violation severity levels
 */
const SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Violation types
 */
const VIOLATION_TYPES = {
  MISSING_DATES: 'missing_dates',
  MISSING_ESTIMATE: 'missing_estimate',
  DONE_WITH_REMAINING: 'done_with_remaining',
  OVERDUE: 'overdue',
  CHILD_AFTER_PARENT: 'child_after_parent',
  DEPENDENCY_CONFLICT: 'dependency_conflict'
};

/**
 * Check all compliance rules against demand issues
 * @param {Array} demandIssues - Array of demand issues
 * @returns {Object} Compliance check results
 */
export async function checkCompliance(demandIssues) {
  const violations = [];
  const issueMap = new Map(demandIssues.map(i => [i.key, i]));

  for (const issue of demandIssues) {
    // Check missing dates
    const dateViolations = checkMissingDates(issue);
    violations.push(...dateViolations);

    // Check missing estimates
    const estimateViolations = checkMissingEstimate(issue);
    violations.push(...estimateViolations);

    // Check done issues with remaining work
    const doneViolations = checkDoneWithRemaining(issue);
    violations.push(...doneViolations);

    // Check overdue issues
    const overdueViolations = checkOverdue(issue);
    violations.push(...overdueViolations);

    // Check child/parent date conflicts
    const parentViolations = checkChildAfterParent(issue, issueMap);
    violations.push(...parentViolations);

    // Check dependency date conflicts
    const depViolations = checkDependencyConflicts(issue, issueMap);
    violations.push(...depViolations);
  }

  // Group violations by type
  const byType = groupViolationsByType(violations);

  // Calculate summary statistics
  const summary = {
    total: violations.length,
    byType: Object.fromEntries(
      Object.entries(byType).map(([type, items]) => [type, items.length])
    ),
    bySeverity: {
      error: violations.filter(v => v.severity === SEVERITY.ERROR).length,
      warning: violations.filter(v => v.severity === SEVERITY.WARNING).length,
      info: violations.filter(v => v.severity === SEVERITY.INFO).length
    }
  };

  return {
    violations,
    byType,
    summary
  };
}

/**
 * Check for missing start or due dates
 */
function checkMissingDates(issue) {
  const violations = [];

  // Skip done issues
  if (issue.status.category === 'done') return violations;

  if (!issue.startDate && !issue.dueDate) {
    violations.push({
      type: VIOLATION_TYPES.MISSING_DATES,
      severity: SEVERITY.WARNING,
      issueKey: issue.key,
      issueSummary: issue.summary,
      message: 'Missing both start date and due date',
      details: {
        hasStartDate: false,
        hasDueDate: false
      }
    });
  } else if (!issue.startDate) {
    violations.push({
      type: VIOLATION_TYPES.MISSING_DATES,
      severity: SEVERITY.INFO,
      issueKey: issue.key,
      issueSummary: issue.summary,
      message: 'Missing start date',
      details: {
        hasStartDate: false,
        hasDueDate: true
      }
    });
  } else if (!issue.dueDate) {
    violations.push({
      type: VIOLATION_TYPES.MISSING_DATES,
      severity: SEVERITY.WARNING,
      issueKey: issue.key,
      issueSummary: issue.summary,
      message: 'Missing due date',
      details: {
        hasStartDate: true,
        hasDueDate: false
      }
    });
  }

  return violations;
}

/**
 * Check for missing remaining estimate
 */
function checkMissingEstimate(issue) {
  const violations = [];

  // Skip done issues and epics
  if (issue.status.category === 'done') return violations;
  if (issue.issueType.name.toLowerCase() === 'epic') return violations;

  if (!issue.remainingEstimate || issue.remainingEstimate <= 0) {
    // Only warn if original estimate also missing
    if (!issue.originalEstimate || issue.originalEstimate <= 0) {
      violations.push({
        type: VIOLATION_TYPES.MISSING_ESTIMATE,
        severity: SEVERITY.WARNING,
        issueKey: issue.key,
        issueSummary: issue.summary,
        message: 'Missing time estimate',
        details: {
          remainingEstimate: issue.remainingEstimate,
          originalEstimate: issue.originalEstimate
        }
      });
    }
  }

  return violations;
}

/**
 * Check for done issues that still have remaining work
 */
function checkDoneWithRemaining(issue) {
  const violations = [];

  if (issue.status.category === 'done' && issue.remainingEstimate > 0) {
    violations.push({
      type: VIOLATION_TYPES.DONE_WITH_REMAINING,
      severity: SEVERITY.ERROR,
      issueKey: issue.key,
      issueSummary: issue.summary,
      message: `Marked as done but has ${issue.remainingEstimate}h remaining`,
      details: {
        status: issue.status.name,
        remainingEstimate: issue.remainingEstimate
      }
    });
  }

  return violations;
}

/**
 * Check for overdue issues
 */
function checkOverdue(issue) {
  const violations = [];

  // Skip done issues
  if (issue.status.category === 'done') return violations;

  if (issue.dueDate && isPast(issue.dueDate)) {
    const daysOverdue = daysDifference(issue.dueDate, getToday());
    violations.push({
      type: VIOLATION_TYPES.OVERDUE,
      severity: daysOverdue > 7 ? SEVERITY.ERROR : SEVERITY.WARNING,
      issueKey: issue.key,
      issueSummary: issue.summary,
      message: `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`,
      details: {
        dueDate: issue.dueDate.toISOString(),
        daysOverdue
      }
    });
  }

  return violations;
}

/**
 * Check if child issue is due after parent epic
 */
function checkChildAfterParent(issue, issueMap) {
  const violations = [];

  if (!issue.parent || !issue.dueDate) return violations;

  const parent = issueMap.get(issue.parent.key);
  if (!parent || !parent.dueDate) return violations;

  if (issue.dueDate > parent.dueDate) {
    const daysDiff = daysDifference(parent.dueDate, issue.dueDate);
    violations.push({
      type: VIOLATION_TYPES.CHILD_AFTER_PARENT,
      severity: SEVERITY.ERROR,
      issueKey: issue.key,
      issueSummary: issue.summary,
      message: `Due ${daysDiff} day${daysDiff !== 1 ? 's' : ''} after parent ${parent.key}`,
      details: {
        parentKey: parent.key,
        parentDueDate: parent.dueDate.toISOString(),
        childDueDate: issue.dueDate.toISOString(),
        daysDifference: daysDiff
      }
    });
  }

  return violations;
}

/**
 * Check for dependency date conflicts (predecessor finishes after successor starts)
 */
function checkDependencyConflicts(issue, issueMap) {
  const violations = [];

  if (!issue.links || !issue.startDate) return violations;

  for (const link of issue.links) {
    // Check issues that block this one
    if (link.type === 'blocked_by') {
      const blocker = issueMap.get(link.targetKey);
      if (!blocker || !blocker.dueDate) continue;

      // Blocker should finish before this issue starts
      if (blocker.dueDate > issue.startDate) {
        const daysDiff = daysDifference(issue.startDate, blocker.dueDate);
        violations.push({
          type: VIOLATION_TYPES.DEPENDENCY_CONFLICT,
          severity: SEVERITY.ERROR,
          issueKey: issue.key,
          issueSummary: issue.summary,
          message: `Blocked by ${blocker.key} which finishes ${daysDiff} day${daysDiff !== 1 ? 's' : ''} after this starts`,
          details: {
            blockerKey: blocker.key,
            blockerDueDate: blocker.dueDate.toISOString(),
            issueStartDate: issue.startDate.toISOString(),
            daysDifference: daysDiff
          }
        });
      }
    }
  }

  return violations;
}

/**
 * Group violations by type
 */
function groupViolationsByType(violations) {
  const byType = {};

  for (const violation of violations) {
    if (!byType[violation.type]) {
      byType[violation.type] = [];
    }
    byType[violation.type].push(violation);
  }

  return byType;
}
