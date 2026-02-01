/**
 * Script to create test data in Jira for Beyond Burndown testing
 *
 * This script uses the Jira REST API to create:
 * - Capacity issues (representing team availability)
 * - Demand issues (tasks, stories, bugs with various states)
 * - Issue links (dependencies between issues)
 *
 * Run with: node test/createTestData.js
 *
 * Prerequisites:
 * - JIRA_BASE_URL environment variable (e.g., https://your-domain.atlassian.net)
 * - JIRA_API_TOKEN environment variable (API token from Atlassian account)
 * - JIRA_EMAIL environment variable (your Atlassian email)
 * - JIRA_PROJECT_KEY environment variable (e.g., BB for Beyond Burndown)
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.JIRA_BASE_URL;
const API_TOKEN = process.env.JIRA_API_TOKEN;
const EMAIL = process.env.JIRA_EMAIL;
const PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'BB';

if (!BASE_URL || !API_TOKEN || !EMAIL) {
  console.error('Missing required environment variables:');
  console.error('  JIRA_BASE_URL - e.g., https://your-domain.atlassian.net');
  console.error('  JIRA_API_TOKEN - API token from Atlassian account');
  console.error('  JIRA_EMAIL - Your Atlassian email');
  console.error('  JIRA_PROJECT_KEY - Project key (default: BB)');
  process.exit(1);
}

const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');

// Helper to make API requests
function jiraRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Helper to format dates for Jira
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper to create a date relative to today
function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

// Create test issues
async function createTestData() {
  console.log('Creating test data in project:', PROJECT_KEY);
  console.log('');

  const createdIssues = [];

  // 1. Create Capacity Issues (Sprint capacity for team members)
  console.log('=== Creating Capacity Issues ===');

  const capacityIssues = [
    { summary: 'Sprint Capacity - Alice', estimate: 40, assignee: 'Alice' },
    { summary: 'Sprint Capacity - Bob', estimate: 32, assignee: 'Bob' },
    { summary: 'Sprint Capacity - Carol', estimate: 40, assignee: 'Carol' }
  ];

  for (const cap of capacityIssues) {
    try {
      const issue = await jiraRequest('POST', '/rest/api/3/issue', {
        fields: {
          project: { key: PROJECT_KEY },
          summary: cap.summary,
          issuetype: { name: 'Task' }, // Use Task or create Capacity type
          customfield_10015: formatDate(futureDate(0)), // Start date
          duedate: formatDate(futureDate(10)), // End date (2 weeks)
          timeoriginalestimate: cap.estimate * 3600 // Convert hours to seconds
        }
      });
      console.log(`Created: ${issue.key} - ${cap.summary}`);
      createdIssues.push({ ...issue, type: 'capacity', ...cap });
    } catch (err) {
      console.error(`Failed to create capacity issue: ${err.message}`);
    }
  }

  // 2. Create Demand Issues (various work items)
  console.log('');
  console.log('=== Creating Demand Issues ===');

  const demandIssues = [
    // Well-estimated issues
    { summary: 'Implement user authentication', estimate: 16, remaining: 16, status: 'To Do', assignee: 'Alice' },
    { summary: 'Add password reset flow', estimate: 8, remaining: 8, status: 'To Do', assignee: 'Alice' },
    { summary: 'Create user profile page', estimate: 12, remaining: 8, status: 'In Progress', assignee: 'Bob' },
    { summary: 'Implement dashboard widgets', estimate: 20, remaining: 20, status: 'To Do', assignee: 'Bob' },
    { summary: 'Add notification system', estimate: 16, remaining: 12, status: 'In Progress', assignee: 'Carol' },

    // Completed issues
    { summary: 'Setup CI/CD pipeline', estimate: 8, remaining: 0, status: 'Done', assignee: 'Alice' },
    { summary: 'Configure test environment', estimate: 4, remaining: 0, status: 'Done', assignee: 'Carol' },

    // Overloaded assignee
    { summary: 'Refactor API endpoints', estimate: 24, remaining: 24, status: 'To Do', assignee: 'Alice' },

    // Missing data (for confidence testing)
    { summary: 'Bug: Login not working', estimate: 0, remaining: 0, status: 'To Do', assignee: null },
    { summary: 'Research caching options', estimate: 4, remaining: 4, status: 'To Do', assignee: null },

    // Overdue issue
    { summary: 'Fix critical security issue', estimate: 8, remaining: 4, status: 'In Progress', assignee: 'Bob', overdue: true }
  ];

  for (const issue of demandIssues) {
    try {
      const startDate = issue.overdue ? futureDate(-5) : futureDate(0);
      const dueDate = issue.overdue ? futureDate(-1) : futureDate(10);

      const created = await jiraRequest('POST', '/rest/api/3/issue', {
        fields: {
          project: { key: PROJECT_KEY },
          summary: issue.summary,
          issuetype: { name: issue.summary.startsWith('Bug') ? 'Bug' : 'Story' },
          customfield_10015: formatDate(startDate),
          duedate: formatDate(dueDate),
          timeoriginalestimate: issue.estimate > 0 ? issue.estimate * 3600 : null,
          timeestimate: issue.remaining > 0 ? issue.remaining * 3600 : null
        }
      });
      console.log(`Created: ${created.key} - ${issue.summary}`);
      createdIssues.push({ ...created, type: 'demand', ...issue });
    } catch (err) {
      console.error(`Failed to create demand issue: ${err.message}`);
    }
  }

  // 3. Create Issue Links (dependencies)
  console.log('');
  console.log('=== Creating Issue Links ===');

  const demandKeys = createdIssues.filter(i => i.type === 'demand').map(i => i.key);

  // Create some blocking relationships
  if (demandKeys.length >= 3) {
    try {
      await jiraRequest('POST', '/rest/api/3/issueLink', {
        type: { name: 'Blocks' },
        inwardIssue: { key: demandKeys[0] }, // Blocker
        outwardIssue: { key: demandKeys[1] } // Blocked
      });
      console.log(`Created link: ${demandKeys[0]} blocks ${demandKeys[1]}`);
    } catch (err) {
      console.error(`Failed to create link: ${err.message}`);
    }
  }

  // Summary
  console.log('');
  console.log('=== Test Data Summary ===');
  console.log(`Created ${createdIssues.filter(i => i.type === 'capacity').length} capacity issues`);
  console.log(`Created ${createdIssues.filter(i => i.type === 'demand').length} demand issues`);
  console.log('');
  console.log('Issue keys created:');
  createdIssues.forEach(i => console.log(`  ${i.key}: ${i.summary || i.fields?.summary}`));

  return createdIssues;
}

// Run the script
createTestData()
  .then(() => {
    console.log('');
    console.log('Test data creation complete!');
  })
  .catch(err => {
    console.error('Error creating test data:', err);
    process.exit(1);
  });
