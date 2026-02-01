import api, { route } from '@forge/api';
import { parseJiraDate, secondsToHours } from '../utils/dateUtils';

/**
 * Fetch capacity issues from Jira using JQL
 * @param {string} jql - JQL query for capacity issues
 * @returns {Promise<Array>} Array of normalized capacity issues
 */
export async function fetchCapacityIssues(jql) {
  const issues = [];

  const fields = [
    'key',
    'summary',
    'duedate',
    'customfield_10015', // Start date
    'timeoriginalestimate', // Original estimate in seconds
    'assignee' // Assignee for per-person capacity
  ];

  // Fetch up to 500 issues to stay within time limits
  const body = {
    jql: jql,
    maxResults: 500,
    fields: fields,
    fieldsByKeys: false
  };

  console.log('Fetching capacity issues:', JSON.stringify(body));

  const response = await api.asApp().requestJira(
    route`/rest/api/3/search/jql`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch capacity issues: ${error}`);
  }

  const data = await response.json();
  const fetchedIssues = data.issues || [];

  for (const issue of fetchedIssues) {
    issues.push(normalizeCapacityIssue(issue));
  }

  return issues;
}

/**
 * Normalize a capacity issue into a consistent format
 * @param {Object} issue - Raw Jira issue
 * @returns {Object} Normalized capacity issue
 */
function normalizeCapacityIssue(issue) {
  const fields = issue.fields || {};

  return {
    key: issue.key,
    id: issue.id,
    summary: fields.summary || '',
    startDate: parseJiraDate(fields.customfield_10015),
    dueDate: parseJiraDate(fields.duedate),
    originalEstimate: secondsToHours(fields.timeoriginalestimate),
    assignee: fields.assignee?.displayName || null
  };
}

/**
 * Build capacity issues from a variable schedule
 * @param {Array} schedule - Array of {startDate, teamHours, memberHours}
 * @param {string} capacityType - 'team' or 'individual'
 * @param {string} period - 'week' or 'month'
 * @returns {Array} Array of capacity issues
 */
export function buildVariableCapacityIssues(schedule, capacityType, period) {
  if (!schedule || schedule.length === 0) {
    return [];
  }

  const issues = [];
  const sortedSchedule = [...schedule].sort((a, b) =>
    new Date(a.startDate) - new Date(b.startDate)
  );

  for (let i = 0; i < sortedSchedule.length; i++) {
    const entry = sortedSchedule[i];
    const startDate = new Date(entry.startDate);

    // Calculate end date based on period or next entry
    let endDate;
    if (i < sortedSchedule.length - 1) {
      // End is day before next entry starts
      endDate = new Date(sortedSchedule[i + 1].startDate);
      endDate.setDate(endDate.getDate() - 1);
    } else {
      // Last entry - extend based on period
      endDate = new Date(startDate);
      if (period === 'week') {
        endDate.setDate(endDate.getDate() + 6);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1);
      }
    }

    if (capacityType === 'team') {
      // Single team entry for this period
      issues.push({
        key: `CAPACITY-${i + 1}`,
        id: `variable-${i}`,
        summary: `Team Capacity`,
        startDate: startDate,
        dueDate: endDate,
        originalEstimate: entry.teamHours || 0,
        assignee: null
      });
    } else {
      // Per-member entries for this period
      const memberHours = entry.memberHours || {};
      Object.entries(memberHours).forEach(([name, hours], mIndex) => {
        if (hours > 0) {
          issues.push({
            key: `CAPACITY-${i + 1}-${mIndex + 1}`,
            id: `variable-${i}-${mIndex}`,
            summary: `${name} Capacity`,
            startDate: startDate,
            dueDate: endDate,
            originalEstimate: hours,
            assignee: name
          });
        }
      });
    }
  }

  return issues;
}

/**
 * Build a single capacity issue from team total hours
 * @param {number} teamHours - Total team hours per period
 * @param {string} period - 'week' or 'month'
 * @param {Date} rangeStart - Start of the analysis date range
 * @param {Date} rangeEnd - End of the analysis date range
 * @returns {Array} Array with single capacity issue
 */
export function buildTeamCapacityIssue(teamHours, period, rangeStart, rangeEnd) {
  if (!teamHours || teamHours <= 0) {
    return [];
  }

  // Calculate total hours for the date range
  const totalHours = calculateTotalHours(teamHours, period, rangeStart, rangeEnd);

  return [{
    key: 'CAPACITY-TEAM',
    id: 'manual-team',
    summary: 'Team Capacity',
    startDate: rangeStart,
    dueDate: rangeEnd,
    originalEstimate: totalHours,
    assignee: null  // No specific assignee for team capacity
  }];
}

/**
 * Build capacity issues from manual team capacity entries
 * @param {Array} teamMembers - Array of team member capacity configs
 * @param {string} period - 'week' or 'month'
 * @param {Date} rangeStart - Start of the analysis date range
 * @param {Date} rangeEnd - End of the analysis date range
 * @returns {Array} Array of capacity issues in the same format as Jira issues
 */
export function buildManualCapacityIssues(teamMembers, period, rangeStart, rangeEnd) {
  if (!teamMembers || teamMembers.length === 0) {
    return [];
  }

  return teamMembers.map((member, idx) => {
    // Use member's date range if specified, otherwise use analysis range
    const memberStart = member.startDate ? new Date(member.startDate) : rangeStart;
    const memberEnd = member.endDate ? new Date(member.endDate) : rangeEnd;

    // Calculate total hours for the date range
    const totalHours = calculateTotalHours(
      member.hoursPerPeriod || 0,
      period,
      memberStart,
      memberEnd
    );

    return {
      key: `CAPACITY-${idx + 1}`,
      id: `manual-${idx}`,
      summary: `${member.name} Capacity`,
      startDate: memberStart,
      dueDate: memberEnd,
      originalEstimate: totalHours,
      assignee: member.name
    };
  });
}

/**
 * Calculate total capacity hours for a date range
 * @param {number} hoursPerPeriod - Hours per week or month
 * @param {string} period - 'week' or 'month'
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Total hours for the date range
 */
function calculateTotalHours(hoursPerPeriod, period, startDate, endDate) {
  if (!startDate || !endDate || hoursPerPeriod <= 0) {
    return 0;
  }

  // Calculate number of days in the range
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.ceil((endDate - startDate) / msPerDay) + 1;

  // Estimate business days (roughly 5/7 of total days)
  const businessDays = Math.ceil(totalDays * (5 / 7));

  if (period === 'week') {
    // Weekly: hoursPerPeriod / 5 business days per week
    const hoursPerDay = hoursPerPeriod / 5;
    return Math.round(hoursPerDay * businessDays * 100) / 100;
  } else {
    // Monthly: hoursPerPeriod / 22 business days per month (average)
    const hoursPerDay = hoursPerPeriod / 22;
    return Math.round(hoursPerDay * businessDays * 100) / 100;
  }
}