import api, { route } from '@forge/api';
import { parseJiraDate, secondsToHours } from '../utils/dateUtils';

/**
 * Dependency link types that indicate blocking relationships
 */
const BLOCKING_LINK_TYPES = [
  'Blocks',
  'blocks',
  'is blocked by',
  'Is blocked by',
  'Depends',
  'depends on',
  'Depends on',
  'is depended on by',
  'Causes',
  'causes',
  'is caused by'
];

/**
 * Fetch demand issues from Jira using JQL
 * @param {string} jql - JQL query for demand issues
 * @returns {Promise<Array>} Array of normalized demand issues
 */
export async function fetchDemandIssues(jql) {
  const issues = [];
  let nextPageToken = null;

  const fields = [
    'key',
    'summary',
    'status',
    'issuetype',
    'priority',
    'assignee',
    'duedate',
    'customfield_10015', // Start date (common custom field)
    'timeoriginalestimate',
    'timeestimate', // Remaining estimate
    'timespent', // Time logged
    'parent',
    'issuelinks'
  ];

  // Fetch up to 500 issues to stay within time limits
  const body = {
    jql: jql,
    maxResults: 500,
    fields: fields,
    fieldsByKeys: false
  };

  if (nextPageToken) {
    body.nextPageToken = nextPageToken;
  }

  console.log('Fetching demand issues:', JSON.stringify(body));

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
    throw new Error(`Failed to fetch demand issues: ${error}`);
  }

  const data = await response.json();
  const fetchedIssues = data.issues || [];

  for (const issue of fetchedIssues) {
    issues.push(normalizeIssue(issue));
  }

  return issues;
}

/**
 * Normalize a Jira issue into a consistent format
 * @param {Object} issue - Raw Jira issue
 * @returns {Object} Normalized issue
 */
function normalizeIssue(issue) {
  const fields = issue.fields || {};

  // Extract blocking relationships
  const links = extractLinks(fields.issuelinks || []);

  return {
    key: issue.key,
    id: issue.id,
    summary: fields.summary || '',
    status: {
      name: fields.status?.name || 'Unknown',
      category: fields.status?.statusCategory?.key || 'undefined'
    },
    issueType: {
      name: fields.issuetype?.name || 'Unknown',
      hierarchyLevel: fields.issuetype?.hierarchyLevel || 0
    },
    priority: fields.priority?.name || 'Medium',
    assignee: fields.assignee?.displayName || null,
    dueDate: parseJiraDate(fields.duedate),
    startDate: parseJiraDate(fields.customfield_10015),
    originalEstimate: secondsToHours(fields.timeoriginalestimate),
    remainingEstimate: secondsToHours(fields.timeestimate),
    timeSpent: secondsToHours(fields.timespent),
    parent: fields.parent ? {
      key: fields.parent.key,
      summary: fields.parent.fields?.summary || ''
    } : null,
    links
  };
}

/**
 * Extract dependency links from issue links
 * @param {Array} issueLinks - Raw issue links from Jira
 * @returns {Array} Normalized links
 */
function extractLinks(issueLinks) {
  const links = [];

  for (const link of issueLinks) {
    const linkType = link.type?.name || '';
    const inwardType = link.type?.inward || '';
    const outwardType = link.type?.outward || '';

    // Check if this is a blocking relationship
    const isBlockingType = BLOCKING_LINK_TYPES.some(
      type => linkType.toLowerCase().includes(type.toLowerCase()) ||
              inwardType.toLowerCase().includes(type.toLowerCase()) ||
              outwardType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isBlockingType) continue;

    if (link.outwardIssue) {
      // This issue blocks the outward issue
      links.push({
        type: 'blocks',
        targetKey: link.outwardIssue.key,
        targetSummary: link.outwardIssue.fields?.summary || '',
        linkTypeName: outwardType
      });
    }

    if (link.inwardIssue) {
      // This issue is blocked by the inward issue
      links.push({
        type: 'blocked_by',
        targetKey: link.inwardIssue.key,
        targetSummary: link.inwardIssue.fields?.summary || '',
        linkTypeName: inwardType
      });
    }
  }

  return links;
}

/**
 * Fetch worklogs for issues that have time spent
 * @param {Array} issues - Array of demand issues
 * @returns {Promise<Array>} Array of worklog entries with date and hours
 */
export async function fetchWorklogs(issues) {
  const worklogs = [];

  // Only fetch worklogs for issues that have time spent
  const issuesWithTimeSpent = issues.filter(issue => issue.timeSpent > 0);

  // Fetch worklogs in parallel (limit to 10 concurrent requests)
  const batchSize = 10;
  for (let i = 0; i < issuesWithTimeSpent.length; i += batchSize) {
    const batch = issuesWithTimeSpent.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(issue => fetchIssueWorklogs(issue.key))
    );
    worklogs.push(...batchResults.flat());
  }

  return worklogs;
}

/**
 * Fetch worklogs for a single issue
 * @param {string} issueKey - Issue key
 * @returns {Promise<Array>} Array of worklog entries
 */
async function fetchIssueWorklogs(issueKey) {
  try {
    const response = await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}/worklog`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch worklogs for ${issueKey}`);
      return [];
    }

    const data = await response.json();
    const entries = data.worklogs || [];

    return entries.map(entry => ({
      issueKey,
      date: parseJiraDate(entry.started),
      hours: secondsToHours(entry.timeSpentSeconds)
    })).filter(entry => entry.date !== null);
  } catch (error) {
    console.warn(`Error fetching worklogs for ${issueKey}:`, error);
    return [];
  }
}
