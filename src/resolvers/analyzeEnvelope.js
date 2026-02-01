import {
  getBusinessDaysBetween,
  countBusinessDays,
  formatDateKey,
  getDateRange,
  addBusinessDays
} from '../utils/businessDays';
import { getToday } from '../utils/dateUtils';

/**
 * Analyze feasibility envelope by comparing demand vs capacity over time
 * @param {Array} demandIssues - Array of demand issues
 * @param {Array} capacityIssues - Array of capacity issues
 * @param {Array} worklogs - Array of worklog entries with date and hours
 * @returns {Object} Envelope analysis results
 */
export async function analyzeEnvelope(demandIssues, capacityIssues, worklogs = []) {
  // Collect all dates for range calculation
  const allDates = [];
  for (const issue of demandIssues) {
    if (issue.startDate) allDates.push(issue.startDate);
    if (issue.dueDate) allDates.push(issue.dueDate);
  }
  for (const issue of capacityIssues) {
    if (issue.startDate) allDates.push(issue.startDate);
    if (issue.dueDate) allDates.push(issue.dueDate);
  }
  // Include worklog dates in range calculation
  for (const worklog of worklogs) {
    if (worklog.date) allDates.push(worklog.date);
  }

  // Get date range for analysis
  const { start: rangeStart, end: rangeEnd } = getDateRange(allDates, 5);
  const businessDays = getBusinessDaysBetween(rangeStart, rangeEnd);

  // Build daily capacity map
  const dailyCapacity = buildDailyCapacity(capacityIssues, businessDays);

  // Build daily demand map
  const dailyDemand = buildDailyDemand(demandIssues, businessDays);

  // Build daily original estimate map (for completion tracking)
  const dailyOriginalEstimate = buildDailyOriginalEstimate(demandIssues, businessDays);

  // Build daily time spent from worklogs
  const dailyTimeSpent = buildDailyTimeSpent(worklogs, businessDays);

  // Calculate cumulative values and identify overloaded days
  const timeline = buildTimeline(businessDays, dailyCapacity, dailyDemand, dailyOriginalEstimate, dailyTimeSpent);

  // Calculate feasibility score
  const feasibilityScore = calculateFeasibilityScore(timeline);

  // Find overloaded periods
  const overloadedPeriods = findOverloadedPeriods(timeline);

  // Calculate total time spent
  const totalTimeSpent = worklogs.reduce((sum, w) => sum + (w.hours || 0), 0);

  // Calculate total original estimate
  const totalOriginalEstimate = timeline.reduce((sum, d) => sum + d.originalEstimate, 0);

  // Calculate totals
  const totals = {
    totalCapacity: timeline.reduce((sum, d) => sum + d.capacity, 0),
    totalDemand: timeline.reduce((sum, d) => sum + d.demand, 0),
    totalOriginalEstimate: Math.round(totalOriginalEstimate * 100) / 100,
    totalTimeSpent: Math.round(totalTimeSpent * 100) / 100,
    totalDays: timeline.length
  };

  // Calculate forecast (when work will complete)
  const forecast = calculateForecast(timeline, totals, rangeEnd);

  // Calculate confidence (data quality score)
  const confidence = calculateConfidence(demandIssues);

  // Calculate resource breakdown (per-person capacity/demand)
  const resources = buildResourceBreakdown(demandIssues, capacityIssues);

  return {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    timeline,
    feasibilityScore,
    overloadedPeriods,
    totals,
    forecast,
    confidence,
    resources
  };
}

/**
 * Build daily capacity from capacity issues by spreading original estimate across business days
 * @param {Array} capacityIssues - Capacity issues
 * @param {Date[]} businessDays - Array of business days
 * @returns {Map<string, number>} Daily capacity (date key -> hours)
 */
function buildDailyCapacity(capacityIssues, businessDays) {
  const dailyCapacity = new Map();

  // Initialize all days with 0
  for (const day of businessDays) {
    dailyCapacity.set(formatDateKey(day), 0);
  }

  // Spread each capacity issue's original estimate across its date range
  for (const issue of capacityIssues) {
    if (!issue.startDate || !issue.dueDate || !issue.originalEstimate) continue;

    const issueDays = getBusinessDaysBetween(issue.startDate, issue.dueDate);
    if (issueDays.length === 0) continue;

    // Spread estimate evenly across business days
    const hoursPerDay = issue.originalEstimate / issueDays.length;

    for (const day of issueDays) {
      const key = formatDateKey(day);
      if (dailyCapacity.has(key)) {
        dailyCapacity.set(key, dailyCapacity.get(key) + hoursPerDay);
      }
    }
  }

  return dailyCapacity;
}

/**
 * Build daily demand by spreading remaining estimates across business days
 * @param {Array} demandIssues - Demand issues
 * @param {Date[]} businessDays - Array of business days
 * @returns {Map<string, { total: number, issues: Array }>} Daily demand with contributing issues
 */
function buildDailyDemand(demandIssues, businessDays) {
  const dailyDemand = new Map();
  const today = getToday();

  // Initialize all days
  for (const day of businessDays) {
    dailyDemand.set(formatDateKey(day), { total: 0, issues: [] });
  }

  // Spread each issue's remaining estimate across its date range
  for (const issue of demandIssues) {
    // Skip done issues
    if (issue.status.category === 'done') continue;

    // Skip issues without remaining estimate
    const remaining = issue.remainingEstimate || 0;
    if (remaining <= 0) continue;

    // Determine start date (use today if no start date or start is in past)
    let effectiveStart = issue.startDate || today;
    if (effectiveStart < today) {
      effectiveStart = today;
    }

    // Use due date or extend 10 business days from start
    const effectiveEnd = issue.dueDate ||
      new Date(effectiveStart.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Get business days for this issue
    const issueDays = getBusinessDaysBetween(effectiveStart, effectiveEnd);
    if (issueDays.length === 0) continue;

    // Spread estimate evenly across days
    const hoursPerDay = remaining / issueDays.length;

    for (const day of issueDays) {
      const key = formatDateKey(day);
      if (dailyDemand.has(key)) {
        const dayData = dailyDemand.get(key);
        dayData.total += hoursPerDay;
        dayData.issues.push({
          key: issue.key,
          summary: issue.summary,
          hours: hoursPerDay
        });
      }
    }
  }

  return dailyDemand;
}

/**
 * Build daily original estimate by spreading original estimates across business days
 * Used for calculating completion percentage
 * @param {Array} demandIssues - Demand issues
 * @param {Date[]} businessDays - Array of business days
 * @returns {Map<string, number>} Daily original estimate (date key -> hours)
 */
function buildDailyOriginalEstimate(demandIssues, businessDays) {
  const dailyOriginalEstimate = new Map();
  const today = getToday();

  // Initialize all days
  for (const day of businessDays) {
    dailyOriginalEstimate.set(formatDateKey(day), 0);
  }

  // Spread each issue's original estimate across its date range
  for (const issue of demandIssues) {
    // Include all issues (even done ones) for original estimate tracking
    const original = issue.originalEstimate || 0;
    if (original <= 0) continue;

    // Determine start date
    let effectiveStart = issue.startDate || today;

    // Use due date or extend 10 business days from start
    const effectiveEnd = issue.dueDate ||
      new Date(effectiveStart.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Get business days for this issue
    const issueDays = getBusinessDaysBetween(effectiveStart, effectiveEnd);
    if (issueDays.length === 0) continue;

    // Spread estimate evenly across days
    const hoursPerDay = original / issueDays.length;

    for (const day of issueDays) {
      const key = formatDateKey(day);
      if (dailyOriginalEstimate.has(key)) {
        dailyOriginalEstimate.set(key, dailyOriginalEstimate.get(key) + hoursPerDay);
      }
    }
  }

  return dailyOriginalEstimate;
}

/**
 * Build daily time spent from worklogs
 * @param {Array} worklogs - Array of worklog entries
 * @param {Date[]} businessDays - Array of business days
 * @returns {Map<string, number>} Daily time spent (date key -> hours)
 */
function buildDailyTimeSpent(worklogs, businessDays) {
  const dailyTimeSpent = new Map();

  // Initialize all days with 0
  for (const day of businessDays) {
    dailyTimeSpent.set(formatDateKey(day), 0);
  }

  // Aggregate worklogs by date
  for (const worklog of worklogs) {
    if (!worklog.date || !worklog.hours) continue;
    const key = formatDateKey(worklog.date);
    if (dailyTimeSpent.has(key)) {
      dailyTimeSpent.set(key, dailyTimeSpent.get(key) + worklog.hours);
    }
  }

  return dailyTimeSpent;
}

/**
 * Build timeline with cumulative values
 * @param {Date[]} businessDays - Array of business days
 * @param {Map<string, number>} dailyCapacity - Daily capacity
 * @param {Map<string, Object>} dailyDemand - Daily demand
 * @param {Map<string, number>} dailyOriginalEstimate - Daily original estimate
 * @param {Map<string, number>} dailyTimeSpent - Daily time spent
 * @returns {Array} Timeline entries
 */
function buildTimeline(businessDays, dailyCapacity, dailyDemand, dailyOriginalEstimate, dailyTimeSpent) {
  const timeline = [];
  let cumulativeCapacity = 0;
  let cumulativeDemand = 0;
  let cumulativeOriginalEstimate = 0;
  let cumulativeTimeSpent = 0;

  for (const day of businessDays) {
    const key = formatDateKey(day);
    const capacity = dailyCapacity.get(key) || 0;
    const demandData = dailyDemand.get(key) || { total: 0, issues: [] };
    const originalEstimate = dailyOriginalEstimate.get(key) || 0;
    const timeSpent = dailyTimeSpent.get(key) || 0;

    cumulativeCapacity += capacity;
    cumulativeDemand += demandData.total;
    cumulativeOriginalEstimate += originalEstimate;
    cumulativeTimeSpent += timeSpent;

    const overload = cumulativeDemand - cumulativeCapacity;

    // Calculate completion percentage (time spent / original estimate)
    const completionPercent = cumulativeOriginalEstimate > 0
      ? Math.round((cumulativeTimeSpent / cumulativeOriginalEstimate) * 100)
      : 0;

    timeline.push({
      date: key,
      displayDate: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      capacity: Math.round(capacity * 100) / 100,
      demand: Math.round(demandData.total * 100) / 100,
      originalEstimate: Math.round(originalEstimate * 100) / 100,
      timeSpent: Math.round(timeSpent * 100) / 100,
      cumulativeCapacity: Math.round(cumulativeCapacity * 100) / 100,
      cumulativeDemand: Math.round(cumulativeDemand * 100) / 100,
      cumulativeOriginalEstimate: Math.round(cumulativeOriginalEstimate * 100) / 100,
      cumulativeTimeSpent: Math.round(cumulativeTimeSpent * 100) / 100,
      completionPercent,
      overload: Math.round(Math.max(0, overload) * 100) / 100,
      isOverloaded: overload > 0,
      contributingIssues: demandData.issues
    });
  }

  return timeline;
}

/**
 * Calculate overall feasibility score (0-100)
 * @param {Array} timeline - Timeline entries
 * @returns {number} Feasibility score
 */
function calculateFeasibilityScore(timeline) {
  if (timeline.length === 0) return 100;

  const lastEntry = timeline[timeline.length - 1];
  const totalCapacity = lastEntry.cumulativeCapacity;
  const totalDemand = lastEntry.cumulativeDemand;

  if (totalCapacity === 0) {
    return totalDemand === 0 ? 100 : 0;
  }

  // Score based on how much capacity covers demand
  const coverageRatio = Math.min(1, totalCapacity / totalDemand);

  // Penalty for number of overloaded days
  const overloadedDays = timeline.filter(d => d.isOverloaded).length;
  const overloadPenalty = Math.min(0.3, (overloadedDays / timeline.length) * 0.5);

  const score = (coverageRatio - overloadPenalty) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Find contiguous overloaded periods
 * @param {Array} timeline - Timeline entries
 * @returns {Array} Overloaded periods
 */
function findOverloadedPeriods(timeline) {
  const periods = [];
  let currentPeriod = null;

  for (const entry of timeline) {
    if (entry.isOverloaded) {
      if (!currentPeriod) {
        currentPeriod = {
          startDate: entry.date,
          endDate: entry.date,
          maxOverload: entry.overload,
          days: 1
        };
      } else {
        currentPeriod.endDate = entry.date;
        currentPeriod.maxOverload = Math.max(currentPeriod.maxOverload, entry.overload);
        currentPeriod.days++;
      }
    } else if (currentPeriod) {
      periods.push(currentPeriod);
      currentPeriod = null;
    }
  }

  if (currentPeriod) {
    periods.push(currentPeriod);
  }

  return periods;
}

/**
 * Calculate forecast for when work will complete
 * @param {Array} timeline - Timeline entries
 * @param {Object} totals - Total capacity/demand values
 * @param {Date} rangeEnd - End of analysis range (deadline)
 * @returns {Object} Forecast details
 */
function calculateForecast(timeline, totals, rangeEnd) {
  if (timeline.length === 0) {
    return { forecastDate: null, extraDays: 0, status: 'on_track', message: 'No data to forecast' };
  }

  const lastEntry = timeline[timeline.length - 1];
  const gap = lastEntry.cumulativeDemand - lastEntry.cumulativeCapacity;

  if (gap <= 0) {
    return {
      forecastDate: null,
      extraDays: 0,
      gap: 0,
      status: 'on_track',
      message: 'Work completes within planned capacity'
    };
  }

  // Calculate average daily capacity
  const avgDailyCapacity = totals.totalDays > 0 ? totals.totalCapacity / totals.totalDays : 0;
  if (avgDailyCapacity <= 0) {
    return {
      forecastDate: null,
      extraDays: null,
      gap,
      status: 'critical',
      message: 'No capacity available to complete remaining work'
    };
  }

  const extraDays = Math.ceil(gap / avgDailyCapacity);
  const deadlineDate = new Date(rangeEnd);
  const forecastDate = addBusinessDays(deadlineDate, extraDays);

  const status = extraDays > 10 ? 'critical' : extraDays > 5 ? 'warning' : 'minor';
  const forecastDisplay = forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    forecastDate: forecastDate.toISOString(),
    extraDays,
    gap: Math.round(gap * 100) / 100,
    avgDailyCapacity: Math.round(avgDailyCapacity * 100) / 100,
    status,
    message: `Work completes ${forecastDisplay} (${extraDays} days after deadline)`
  };
}

/**
 * Calculate confidence score based on data quality
 * @param {Array} demandIssues - Demand issues
 * @returns {Object} Confidence details
 */
function calculateConfidence(demandIssues) {
  const total = demandIssues.length;
  if (total === 0) {
    return {
      overallScore: 100,
      level: 'high',
      breakdown: {
        estimates: { count: 0, total: 0, percent: 100 },
        dates: { count: 0, total: 0, percent: 100 },
        assignees: { count: 0, total: 0, percent: 100 }
      },
      warnings: []
    };
  }

  let hasEstimate = 0;
  let hasDates = 0;
  let hasAssignee = 0;

  for (const issue of demandIssues) {
    if (issue.remainingEstimate > 0 || issue.originalEstimate > 0) hasEstimate++;
    if (issue.startDate && issue.dueDate) hasDates++;
    if (issue.assignee) hasAssignee++;
  }

  const estimatePercent = (hasEstimate / total) * 100;
  const datePercent = (hasDates / total) * 100;
  const assigneePercent = (hasAssignee / total) * 100;
  const overallScore = Math.round((estimatePercent + datePercent + assigneePercent) / 3);

  // Generate warnings
  const warnings = [];
  if (estimatePercent < 80) {
    warnings.push(`${total - hasEstimate} issues missing estimates`);
  }
  if (datePercent < 80) {
    warnings.push(`${total - hasDates} issues missing dates`);
  }
  if (assigneePercent < 80) {
    warnings.push(`${total - hasAssignee} issues unassigned`);
  }

  return {
    overallScore,
    level: overallScore >= 80 ? 'high' : overallScore >= 60 ? 'medium' : 'low',
    breakdown: {
      estimates: { count: hasEstimate, total, percent: Math.round(estimatePercent) },
      dates: { count: hasDates, total, percent: Math.round(datePercent) },
      assignees: { count: hasAssignee, total, percent: Math.round(assigneePercent) }
    },
    warnings
  };
}

/**
 * Build resource breakdown showing capacity and demand per assignee
 * @param {Array} demandIssues - Demand issues
 * @param {Array} capacityIssues - Capacity issues
 * @returns {Array} Resource breakdown by assignee
 */
function buildResourceBreakdown(demandIssues, capacityIssues) {
  const resourceMap = new Map();

  // Aggregate capacity by assignee from capacity issues
  for (const issue of capacityIssues) {
    const assignee = issue.assignee || 'Team Pool';
    if (!resourceMap.has(assignee)) {
      resourceMap.set(assignee, {
        assignee,
        capacity: 0,
        demand: 0,
        timeSpent: 0,
        issueCount: 0
      });
    }
    resourceMap.get(assignee).capacity += issue.originalEstimate || 0;
  }

  // Aggregate demand by assignee from demand issues
  for (const issue of demandIssues) {
    if (issue.status.category === 'done') continue;
    const assignee = issue.assignee || 'Unassigned';

    if (!resourceMap.has(assignee)) {
      resourceMap.set(assignee, {
        assignee,
        capacity: 0,
        demand: 0,
        timeSpent: 0,
        issueCount: 0
      });
    }
    const r = resourceMap.get(assignee);
    r.demand += issue.remainingEstimate || 0;
    r.timeSpent += issue.timeSpent || 0;
    r.issueCount++;
  }

  // Calculate derived metrics and status
  return Array.from(resourceMap.values()).map(r => {
    const loadPercent = r.capacity > 0 ? Math.round((r.demand / r.capacity) * 100) : null;
    const utilizationPercent = r.capacity > 0 ? Math.round((r.timeSpent / r.capacity) * 100) : null;

    let status;
    if (r.capacity === 0) {
      status = r.demand > 0 ? 'no_capacity' : 'idle';
    } else if (r.demand > r.capacity) {
      status = 'overloaded';
    } else if (r.demand < r.capacity * 0.8) {
      status = 'under_utilized';
    } else {
      status = 'on_track';
    }

    return {
      assignee: r.assignee,
      capacity: Math.round(r.capacity * 100) / 100,
      demand: Math.round(r.demand * 100) / 100,
      timeSpent: Math.round(r.timeSpent * 100) / 100,
      issueCount: r.issueCount,
      loadPercent,
      utilizationPercent,
      status
    };
  }).sort((a, b) => b.demand - a.demand);
}
