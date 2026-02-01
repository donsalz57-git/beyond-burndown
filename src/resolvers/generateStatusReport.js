/**
 * Generate Status Report for management
 * Aggregates all metrics into a comprehensive report format
 */

/**
 * Get status indicator based on feasibility score
 * @param {number} score
 * @returns {string} Status: 'green', 'yellow', or 'red'
 */
function getScoreStatus(score) {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

/**
 * Generate a comprehensive status report
 * @param {Object} envelope - Envelope analysis results
 * @param {Object} compliance - Compliance check results
 * @param {Object} dependencies - Dependency analysis results
 * @param {Array} demandIssues - Demand issues for additional calculations
 * @returns {Object} Status report
 */
export function generateStatusReport(envelope, compliance, dependencies, demandIssues) {
  const now = new Date();

  // Count done issues (closed this week approximation)
  const doneIssues = demandIssues.filter(i => i.status.category === 'done');
  const closedCount = doneIssues.length;
  const closedHours = doneIssues.reduce((sum, i) => sum + (i.timeSpent || i.originalEstimate || 0), 0);

  // Count remaining issues
  const remainingIssues = demandIssues.filter(i => i.status.category !== 'done');
  const remainingCount = remainingIssues.length;
  const remainingHours = remainingIssues.reduce((sum, i) => sum + (i.remainingEstimate || 0), 0);

  // Calculate utilization
  const utilization = envelope.totals.totalCapacity > 0
    ? Math.round((envelope.totals.totalTimeSpent / envelope.totals.totalCapacity) * 100)
    : 0;

  // Calculate completion percentage
  const completionPercent = envelope.totals.totalOriginalEstimate > 0
    ? Math.round((envelope.totals.totalTimeSpent / envelope.totals.totalOriginalEstimate) * 100)
    : 0;

  // Build headline metrics
  const headline = {
    feasibility: {
      score: envelope.feasibilityScore,
      status: getScoreStatus(envelope.feasibilityScore),
      trend: null // Would need historical data
    },
    forecast: {
      date: envelope.forecast?.forecastDate || null,
      extraDays: envelope.forecast?.extraDays || 0,
      status: envelope.forecast?.status || 'on_track',
      message: envelope.forecast?.message || 'On track'
    },
    capacityUtilization: {
      percent: utilization,
      status: utilization > 100 ? 'red' : utilization > 80 ? 'green' : 'yellow'
    },
    completion: {
      percent: completionPercent,
      status: 'info'
    }
  };

  // Build schedule section
  const schedule = {
    deadline: envelope.rangeEnd,
    forecast: envelope.forecast?.forecastDate || envelope.rangeEnd,
    buffer: envelope.forecast?.extraDays ? -envelope.forecast.extraDays : 0,
    bufferLabel: envelope.forecast?.extraDays
      ? `${envelope.forecast.extraDays} days late`
      : 'On time'
  };

  // Build capacity section
  const capacity = {
    available: Math.round(envelope.totals.totalCapacity * 100) / 100,
    demand: Math.round(envelope.totals.totalDemand * 100) / 100,
    timeSpent: Math.round(envelope.totals.totalTimeSpent * 100) / 100,
    gap: Math.round((envelope.totals.totalDemand - envelope.totals.totalCapacity) * 100) / 100,
    utilizationPercent: utilization
  };

  // Build progress section
  const progress = {
    closedCount,
    closedHours: Math.round(closedHours * 100) / 100,
    remainingCount,
    remainingHours: Math.round(remainingHours * 100) / 100,
    completionPercent
  };

  // Build risks section
  const risks = {
    overloadedPeriods: {
      count: envelope.overloadedPeriods.length,
      details: envelope.overloadedPeriods.slice(0, 3).map(p => ({
        dates: p.startDate === p.endDate ? p.startDate : `${p.startDate} - ${p.endDate}`,
        days: p.days,
        maxOverload: p.maxOverload
      }))
    },
    complianceViolations: {
      count: compliance.summary?.total || 0,
      bySeverity: compliance.summary?.bySeverity || { error: 0, warning: 0, info: 0 }
    },
    circularDependencies: {
      count: dependencies.circularDependencies?.length || 0,
      details: (dependencies.circularDependencies || []).slice(0, 3).map(c => c.description)
    },
    overdueIssues: {
      count: (compliance.byType?.overdue || []).length,
      hours: (compliance.byType?.overdue || []).reduce(
        (sum, v) => sum + (demandIssues.find(i => i.key === v.issueKey)?.remainingEstimate || 0),
        0
      )
    }
  };

  // Generate decisions needed
  const decisions = [];

  if (envelope.feasibilityScore < 50) {
    decisions.push({
      priority: 'high',
      title: 'Critical Capacity Shortfall',
      description: `Feasibility at ${envelope.feasibilityScore}%. Current demand exceeds capacity by ${capacity.gap.toFixed(1)}h.`,
      options: ['Add developers', 'Reduce scope', 'Extend deadline']
    });
  }

  if (dependencies.circularDependencies?.length > 0) {
    decisions.push({
      priority: 'high',
      title: 'Circular Dependencies Detected',
      description: `${dependencies.circularDependencies.length} circular dependency chain(s) blocking work.`,
      action: 'Break dependency cycles to unblock issues'
    });
  }

  if (risks.overdueIssues.count > 0) {
    decisions.push({
      priority: 'medium',
      title: 'Overdue Issues',
      description: `${risks.overdueIssues.count} issues are overdue (${risks.overdueIssues.hours.toFixed(1)}h of work).`,
      action: 'Review blockers and reassign if needed'
    });
  }

  if (envelope.confidence?.level === 'low') {
    decisions.push({
      priority: 'medium',
      title: 'Low Data Confidence',
      description: `Only ${envelope.confidence.overallScore}% of issues have complete data.`,
      action: 'Add missing estimates, dates, and assignees'
    });
  }

  return {
    generatedAt: now.toISOString(),
    headline,
    schedule,
    capacity,
    progress,
    risks,
    decisions,
    confidence: envelope.confidence
  };
}
