/**
 * Scope History Analysis
 * Tracks scope changes over time for visualization and trend analysis
 */

/**
 * Analyze scope history from demand issues and timeline
 * @param {Array} demandIssues - All demand issues
 * @param {Array} timeline - Timeline from envelope analysis
 * @returns {Object} Scope analysis results
 */
export function analyzeScopeHistory(demandIssues, timeline) {
  // Calculate total scope metrics
  const totalOriginalEstimate = demandIssues.reduce(
    (sum, i) => sum + (i.originalEstimate || 0), 0
  );

  const totalRemainingEstimate = demandIssues
    .filter(i => i.status.category !== 'done')
    .reduce((sum, i) => sum + (i.remainingEstimate || 0), 0);

  const completedEstimate = demandIssues
    .filter(i => i.status.category === 'done')
    .reduce((sum, i) => sum + (i.timeSpent || i.originalEstimate || 0), 0);

  // Build simplified scope timeline
  // For now, show current snapshot repeated (real historical data would require storage)
  const scopeTimeline = timeline.map((day, idx) => ({
    date: day.date,
    displayDate: day.displayDate,
    originalScope: totalOriginalEstimate,
    currentScope: totalRemainingEstimate + completedEstimate,
    completedScope: completedEstimate,
    remainingScope: totalRemainingEstimate
  }));

  return {
    scopeTimeline,
    totals: {
      originalScope: Math.round(totalOriginalEstimate * 100) / 100,
      currentScope: Math.round((totalRemainingEstimate + completedEstimate) * 100) / 100,
      completedScope: Math.round(completedEstimate * 100) / 100,
      remainingScope: Math.round(totalRemainingEstimate * 100) / 100
    }
  };
}

/**
 * Get week key from date
 * @param {Date} date
 * @returns {string} Week key in format "YYYY-WNN"
 */
function getWeekKey(date) {
  const d = new Date(date);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get display label for week
 * @param {Date} date
 * @returns {string} Week label
 */
function getWeekLabel(date) {
  const d = new Date(date);
  // Get Monday of this week
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Calculate weekly scope change trend
 * Groups issues by creation/resolution week to show net scope changes
 * @param {Array} demandIssues - All demand issues
 * @returns {Object} Scope change trend data
 */
export function calculateScopeChangeTrend(demandIssues) {
  const weeks = new Map();
  const alerts = [];

  // Collect all relevant dates to build week range
  const allDates = [];
  for (const issue of demandIssues) {
    if (issue.startDate) allDates.push(new Date(issue.startDate));
    if (issue.dueDate) allDates.push(new Date(issue.dueDate));
  }

  if (allDates.length === 0) {
    return { trend: [], alerts: [] };
  }

  // Get date range
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  // Build weeks map
  const current = new Date(minDate);
  while (current <= maxDate) {
    const weekKey = getWeekKey(current);
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, {
        week: weekKey,
        weekLabel: getWeekLabel(current),
        added: 0,
        removed: 0,
        addedCount: 0,
        removedCount: 0
      });
    }
    current.setDate(current.getDate() + 7);
  }

  // Simulate scope changes based on issue dates
  // In reality, this would track historical changes from Jira changelog
  // For now, we'll show estimated changes based on start/due dates
  for (const issue of demandIssues) {
    const estimate = issue.originalEstimate || 0;

    // Issues starting add scope
    if (issue.startDate) {
      const weekKey = getWeekKey(new Date(issue.startDate));
      if (weeks.has(weekKey)) {
        weeks.get(weekKey).added += estimate;
        weeks.get(weekKey).addedCount++;
      }
    }

    // Done issues remove scope from remaining
    if (issue.status.category === 'done' && issue.dueDate) {
      const weekKey = getWeekKey(new Date(issue.dueDate));
      if (weeks.has(weekKey)) {
        weeks.get(weekKey).removed += estimate;
        weeks.get(weekKey).removedCount++;
      }
    }
  }

  // Convert to array and calculate running totals
  const trend = [];
  let runningTotal = 0;

  for (const [, week] of Array.from(weeks.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const netChange = week.added - week.removed;
    runningTotal += netChange;

    const growthPercent = runningTotal > 0 ? Math.round((netChange / runningTotal) * 100) : 0;

    trend.push({
      week: week.week,
      weekLabel: week.weekLabel,
      added: Math.round(week.added * 100) / 100,
      removed: Math.round(week.removed * 100) / 100,
      netChange: Math.round(netChange * 100) / 100,
      totalScope: Math.round(runningTotal * 100) / 100,
      addedCount: week.addedCount,
      removedCount: week.removedCount,
      growthPercent
    });

    // Generate alert if scope grew more than 10%
    if (growthPercent > 10) {
      alerts.push({
        week: week.weekLabel,
        message: `Scope grew ${growthPercent}% in week of ${week.weekLabel}`,
        severity: growthPercent > 20 ? 'error' : 'warning'
      });
    }
  }

  return { trend, alerts };
}
