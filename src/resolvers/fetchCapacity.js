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