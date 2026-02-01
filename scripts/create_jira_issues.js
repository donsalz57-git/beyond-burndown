#!/usr/bin/env node
/**
 * Create Jira issues for Beyond Burndown E2E testing tasks.
 *
 * Usage:
 *   node scripts/create_jira_issues.js
 */

const https = require('https');
const { URL } = require('url');

// Configuration - uses environment variables
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
  console.error('Example (Windows CMD):');
  console.error('  set JIRA_EMAIL=your.email@example.com');
  console.error('  set JIRA_API_TOKEN=your-api-token');
  console.error('  node scripts/create_jira_issues.js');
  console.error('');
  console.error('Get your API token at: https://id.atlassian.com/manage-profile/security/api-tokens');
  process.exit(1);
}

// Issues to create
const ISSUES = [
  {
    summary: 'Set up Playwright E2E testing infrastructure',
    description: `h2. Summary
Set up end-to-end testing infrastructure using Playwright to test the Beyond Burndown gadget UI.

h2. Background
We need E2E tests to verify the gadget functionality works correctly across browsers and simulates real user interactions. Unit tests are in place (440 total), but we need integration/E2E tests for complete coverage.

h2. Completed Work
* Installed Playwright and configured for multi-browser testing
* Created initial E2E test suite in e2e/gadget.spec.js
* Created mock data helpers in e2e/fixtures/forge-mock.js
* Added npm scripts for running tests

h2. Test Coverage
* Gadget loading states (loading, error, success)
* Tab navigation (all 7 tabs)
* Summary bar display
* What-If panel functionality
* Export menu
* Feasibility chart
* Accessibility checks

h2. How to Run
{code}
npm run test:e2e        # Run all tests
npm run test:e2e:ui     # Interactive UI mode
npm run test:e2e:headed # Visible browser
npm run test:e2e:report # View report
{code}`,
    issuetype: 'Task',
    labels: ['testing', 'e2e', 'playwright']
  },
  {
    summary: 'Set up Forge bridge mocking for E2E tests',
    description: `h2. Summary
Implement proper Forge bridge mocking so E2E tests can run without a live Jira connection.

h2. Requirements
* Mock @forge/bridge invoke() function
* Mock view.getContext() for edit/view mode detection
* Mock view.submit() and view.close() for config panel
* Support different mock data scenarios

h2. Acceptance Criteria
* E2E tests run successfully without Jira connection
* Can simulate different data states (loading, error, empty, full data)
* Mock data is realistic and covers edge cases`,
    issuetype: 'Task',
    labels: ['testing', 'e2e', 'mocking']
  },
  {
    summary: 'Add CI/CD pipeline integration for E2E tests',
    description: `h2. Summary
Integrate Playwright E2E tests into the CI/CD pipeline.

h2. Requirements
* Run E2E tests on pull requests
* Run E2E tests before deployment
* Generate and archive test reports
* Fail build on test failures

h2. Tasks
* Create GitHub Actions workflow for E2E tests
* Configure Playwright for CI environment
* Set up artifact storage for test reports
* Add status badges to README

h2. Acceptance Criteria
* E2E tests run automatically on PRs
* Test results are visible in PR checks
* Reports are accessible for debugging failures`,
    issuetype: 'Task',
    labels: ['testing', 'e2e', 'ci-cd', 'github-actions']
  },
  {
    summary: 'Create Jira integration E2E tests',
    description: `h2. Summary
Create E2E tests that verify the gadget works correctly when integrated with Jira.

h2. Test Scenarios
* Gadget loads correctly on Jira dashboard
* JQL queries return expected data
* Config panel saves settings correctly
* Data refreshes when issues change
* Edit mode vs view mode behavior

h2. Requirements
* Test against a dedicated test Jira project
* Use realistic test data
* Test error handling (invalid JQL, permissions, etc.)

h2. Acceptance Criteria
* Tests cover main Jira integration flows
* Tests are stable and not flaky
* Can run against staging environment`,
    issuetype: 'Task',
    labels: ['testing', 'e2e', 'jira-integration']
  },
  {
    summary: 'Add visual regression testing',
    description: `h2. Summary
Implement visual regression testing to catch unintended UI changes.

h2. Requirements
* Capture baseline screenshots for all views
* Compare against baselines on each test run
* Highlight visual differences
* Easy baseline update workflow

h2. Views to Test
* Feasibility chart (daily, weekly, monthly views)
* What-If panel (all scenario types)
* Compliance panel (with and without violations)
* Dependencies view (with and without cycles)
* Team health view
* Status report
* Config panel

h2. Acceptance Criteria
* Visual tests catch CSS/layout regressions
* False positives are minimized
* Baseline updates are easy to review and approve`,
    issuetype: 'Task',
    labels: ['testing', 'e2e', 'visual-regression']
  },
  {
    summary: 'Add mobile and tablet viewport E2E tests',
    description: `h2. Summary
Add E2E tests for different viewport sizes to ensure responsive design works correctly.

h2. Viewports to Test
* Mobile (375x667 - iPhone SE)
* Mobile Large (414x896 - iPhone 11)
* Tablet (768x1024 - iPad)
* Desktop (1280x720)
* Desktop Large (1920x1080)

h2. Requirements
* Test main flows on each viewport
* Verify responsive breakpoints work correctly
* Check touch interactions on mobile viewports

h2. Acceptance Criteria
* All viewports pass E2E tests
* No horizontal scrolling on mobile
* Touch targets are appropriately sized`,
    issuetype: 'Task',
    labels: ['testing', 'e2e', 'responsive', 'mobile']
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
      path: url.pathname,
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
          resolve({ success: true, data: data ? JSON.parse(data) : null });
        } else {
          resolve({ success: false, status: res.statusCode, error: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Check if project exists
 */
async function checkProject() {
  console.log(`\nChecking project ${CONFIG.projectKey}...`);
  const result = await jiraRequest('GET', `/rest/api/2/project/${CONFIG.projectKey}`);
  if (result.success) {
    console.log(`  ✓ Project ${CONFIG.projectKey} found: ${result.data.name}`);
    return true;
  } else {
    console.log(`  ✗ Project not found: ${result.error}`);
    return false;
  }
}

/**
 * Create a single issue
 */
async function createIssue(issue) {
  const payload = {
    fields: {
      project: { key: CONFIG.projectKey },
      summary: issue.summary,
      description: issue.description,
      issuetype: { name: issue.issuetype || 'Task' }
    }
  };

  if (issue.labels && issue.labels.length > 0) {
    payload.fields.labels = issue.labels;
  }

  const result = await jiraRequest('POST', '/rest/api/2/issue', payload);
  return result;
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Beyond Burndown - Jira Issue Creator');
  console.log('='.repeat(60));
  console.log(`Jira URL: ${CONFIG.jiraUrl}`);
  console.log(`Project:  ${CONFIG.projectKey}`);
  console.log(`Issues:   ${ISSUES.length}`);
  console.log('-'.repeat(60));

  // Check project exists
  const projectExists = await checkProject();
  if (!projectExists) {
    console.log('\nERROR: Cannot access project. Check your credentials and project key.');
    process.exit(1);
  }

  console.log('\nCreating issues...');
  console.log('-'.repeat(60));

  const created = [];
  const failed = [];

  for (let i = 0; i < ISSUES.length; i++) {
    const issue = ISSUES[i];
    const shortSummary = issue.summary.length > 45
      ? issue.summary.substring(0, 45) + '...'
      : issue.summary;

    console.log(`\n[${i + 1}/${ISSUES.length}] ${shortSummary}`);

    try {
      const result = await createIssue(issue);

      if (result.success) {
        console.log(`  ✓ Created: ${result.data.key}`);
        created.push({
          key: result.data.key,
          summary: issue.summary,
          url: `${CONFIG.jiraUrl}/browse/${result.data.key}`
        });
      } else {
        console.log(`  ✗ Failed: ${result.status} - ${result.error.substring(0, 100)}`);
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
    for (const item of created) {
      console.log(`  ${item.key}: ${item.summary.substring(0, 40)}`);
      console.log(`    ${item.url}`);
    }
  }

  if (failed.length > 0) {
    console.log('\n✗ Failed Issues:');
    for (const summary of failed) {
      console.log(`  - ${summary}`);
    }
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done!');
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
