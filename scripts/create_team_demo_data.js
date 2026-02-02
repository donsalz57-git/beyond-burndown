#!/usr/bin/env node
/**
 * Create Jira issues with estimates, assignees, and worklogs
 * to demonstrate the Team chart feature in Beyond Burndown.
 *
 * Usage:
 *   set JIRA_EMAIL=your.email@example.com
 *   set JIRA_API_TOKEN=your-api-token
 *   node scripts/create_team_demo_data.js
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const CONFIG = {
  jiraUrl: process.env.JIRA_URL || 'https://donsalz57.atlassian.net',
  email: process.env.JIRA_EMAIL || '',
  apiToken: process.env.JIRA_API_TOKEN || '',
  projectKey: process.env.JIRA_PROJECT || 'BB'
};

// Check required config
if (!CONFIG.email || !CONFIG.apiToken) {
  console.error('ERROR: Missing required environment variables');
  console.error('');
  console.error('Set the following environment variables:');
  console.error('  JIRA_EMAIL      - Your Jira email');
  console.error('  JIRA_API_TOKEN  - Your Jira API token');
  console.error('');
  console.error('Optional:');
  console.error('  JIRA_URL        - Jira instance URL (default: https://donsalz57.atlassian.net)');
  console.error('  JIRA_PROJECT    - Project key (default: BB)');
  console.error('');
  console.error('Get your API token at: https://id.atlassian.com/manage-profile/security/api-tokens');
  process.exit(1);
}

// Helper to get date offset from today
function getDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

// Demo issues with estimates, dates, and planned worklogs
const DEMO_ISSUES = [
  {
    summary: '[Demo] API Integration Module',
    description: 'Build the REST API integration layer for external services.',
    estimate: '16h',  // 16 hours = 2 days
    startDate: getDate(0),  // Today
    dueDate: getDate(10),   // 10 days from now
    worklogHours: 4  // Log 4 hours of work
  },
  {
    summary: '[Demo] User Dashboard Design',
    description: 'Create responsive dashboard layout with charts and widgets.',
    estimate: '24h',  // 24 hours = 3 days
    startDate: getDate(-2),  // Started 2 days ago
    dueDate: getDate(7),
    worklogHours: 8  // Log 8 hours
  },
  {
    summary: '[Demo] Database Schema Update',
    description: 'Add new tables for analytics and reporting features.',
    estimate: '8h',  // 1 day
    startDate: getDate(3),
    dueDate: getDate(5),
    worklogHours: 0
  },
  {
    summary: '[Demo] Authentication Service',
    description: 'Implement OAuth 2.0 authentication flow.',
    estimate: '20h',
    startDate: getDate(-5),
    dueDate: getDate(2),
    worklogHours: 12
  },
  {
    summary: '[Demo] Report Generation',
    description: 'Build PDF and CSV export functionality for reports.',
    estimate: '12h',
    startDate: getDate(5),
    dueDate: getDate(12),
    worklogHours: 0
  },
  {
    summary: '[Demo] Performance Optimization',
    description: 'Optimize database queries and add caching layer.',
    estimate: '16h',
    startDate: getDate(1),
    dueDate: getDate(8),
    worklogHours: 2
  }
];

/**
 * Make an HTTPS request to Jira API
 */
function jiraRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.jiraUrl);
    const auth = Buffer.from(`${CONFIG.email}:${CONFIG.apiToken}`).toString('base64');

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + (url.search || ''),
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: data ? JSON.parse(data) : null, status: res.statusCode });
        } else {
          resolve({ success: false, status: res.statusCode, error: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Get current user's account ID
 */
async function getCurrentUser() {
  const result = await jiraRequest('GET', '/rest/api/2/myself');
  if (result.success) {
    return result.data;
  }
  return null;
}

/**
 * Get project users
 */
async function getProjectUsers() {
  const result = await jiraRequest('GET', `/rest/api/2/user/assignable/search?project=${CONFIG.projectKey}&maxResults=10`);
  if (result.success) {
    return result.data;
  }
  return [];
}

/**
 * Create an issue with estimate and dates
 */
async function createIssue(issue, assigneeId) {
  const payload = {
    fields: {
      project: { key: CONFIG.projectKey },
      summary: issue.summary,
      description: issue.description,
      issuetype: { name: 'Task' },
      labels: ['demo', 'team-chart-test']
    }
  };

  // Add assignee if provided
  if (assigneeId) {
    payload.fields.assignee = { accountId: assigneeId };
  }

  // Add time estimate (in seconds)
  if (issue.estimate) {
    const hours = parseInt(issue.estimate);
    payload.fields.timetracking = {
      originalEstimate: issue.estimate
    };
  }

  // Add due date
  if (issue.dueDate) {
    payload.fields.duedate = issue.dueDate;
  }

  // Add start date (custom field - may need adjustment)
  // Note: Start date field ID varies by Jira instance
  // Common field IDs: customfield_10015, customfield_10016
  if (issue.startDate) {
    payload.fields.customfield_10015 = issue.startDate;
  }

  return await jiraRequest('POST', '/rest/api/2/issue', payload);
}

/**
 * Add worklog to an issue
 */
async function addWorklog(issueKey, hours) {
  if (hours <= 0) return { success: true, skipped: true };

  const payload = {
    timeSpentSeconds: hours * 3600,  // Convert hours to seconds
    comment: 'Demo worklog for Team chart testing',
    started: new Date().toISOString().replace('Z', '+0000')
  };

  return await jiraRequest('POST', `/rest/api/2/issue/${issueKey}/worklog`, payload);
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Beyond Burndown - Team Chart Demo Data Creator');
  console.log('='.repeat(60));
  console.log(`Jira URL: ${CONFIG.jiraUrl}`);
  console.log(`Project:  ${CONFIG.projectKey}`);
  console.log(`Issues:   ${DEMO_ISSUES.length}`);
  console.log('-'.repeat(60));

  // Get current user
  console.log('\nGetting current user...');
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    console.error('ERROR: Could not get current user. Check credentials.');
    process.exit(1);
  }
  console.log(`  ✓ Logged in as: ${currentUser.displayName} (${currentUser.accountId})`);

  // Get project users for assignment rotation
  console.log('\nGetting project users...');
  const users = await getProjectUsers();
  console.log(`  ✓ Found ${users.length} assignable users`);
  users.slice(0, 5).forEach(u => console.log(`    - ${u.displayName}`));

  console.log('\nCreating demo issues...');
  console.log('-'.repeat(60));

  const created = [];
  const failed = [];

  for (let i = 0; i < DEMO_ISSUES.length; i++) {
    const issue = DEMO_ISSUES[i];

    // Rotate through users for assignment
    const assignee = users[i % users.length];
    const assigneeId = assignee?.accountId;

    console.log(`\n[${i + 1}/${DEMO_ISSUES.length}] ${issue.summary}`);
    console.log(`    Estimate: ${issue.estimate}, Due: ${issue.dueDate}, Assignee: ${assignee?.displayName || 'Unassigned'}`);

    try {
      // Create the issue
      const result = await createIssue(issue, assigneeId);

      if (result.success) {
        const issueKey = result.data.key;
        console.log(`  ✓ Created: ${issueKey}`);

        // Add worklog if specified
        if (issue.worklogHours > 0) {
          const worklogResult = await addWorklog(issueKey, issue.worklogHours);
          if (worklogResult.success) {
            console.log(`  ✓ Added worklog: ${issue.worklogHours}h`);
          } else {
            console.log(`  ⚠ Worklog failed: ${worklogResult.error?.substring(0, 50) || 'Unknown error'}`);
          }
        }

        created.push({
          key: issueKey,
          summary: issue.summary,
          estimate: issue.estimate,
          worklog: issue.worklogHours,
          assignee: assignee?.displayName || 'Unassigned',
          url: `${CONFIG.jiraUrl}/browse/${issueKey}`
        });
      } else {
        console.log(`  ✗ Failed: ${result.status}`);
        console.log(`    ${result.error?.substring(0, 200) || 'Unknown error'}`);
        failed.push(issue.summary);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failed.push(issue.summary);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Created: ${created.length}`);
  console.log(`Failed:  ${failed.length}`);

  if (created.length > 0) {
    console.log('\n✓ Created Issues:');
    console.log('-'.repeat(60));
    let totalEstimate = 0;
    let totalWorklog = 0;
    for (const item of created) {
      console.log(`  ${item.key}: ${item.summary.substring(0, 35)}`);
      console.log(`    Estimate: ${item.estimate}, Logged: ${item.worklog}h, Assignee: ${item.assignee}`);
      totalEstimate += parseInt(item.estimate) || 0;
      totalWorklog += item.worklog;
    }
    console.log('-'.repeat(60));
    console.log(`  Total Estimate: ${totalEstimate}h`);
    console.log(`  Total Logged:   ${totalWorklog}h`);
  }

  if (failed.length > 0) {
    console.log('\n✗ Failed Issues:');
    for (const summary of failed) {
      console.log(`  - ${summary}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('NEXT STEPS:');
  console.log('='.repeat(60));
  console.log('1. Open Beyond Burndown in Jira');
  console.log('2. Go to the Capacity tab');
  console.log('3. Add the assignees with their weekly hours');
  console.log('4. Go to Team tab to see the chart with all 3 lines');
  console.log('='.repeat(60));
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
