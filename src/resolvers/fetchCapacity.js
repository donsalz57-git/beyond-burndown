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