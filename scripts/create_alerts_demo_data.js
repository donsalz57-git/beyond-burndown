#!/usr/bin/env node
/**
 * Create Jira issues that demonstrate all alert types
 * detected by Beyond Burndown's Alerts tab.
 *
 * Alert Types:
 *   1. Missing Dates - No start date and/or no due date
 *   2. Missing Estimate - No time estimate
 *   3. Done with Remaining - Done status but remaining estimate > 0
 *   4. Overdue - Past due date but not Done
 *   5. Child After Parent - Child due after parent Epic
 *   6. Dependency Conflict - Blocker finishes after dependent starts
 *
 * Usage:
 *   set JIRA_EMAIL=your.email@example.com
 *   set JIRA_API_TOKEN=your-api-token
 *   node scripts/create_alerts_demo_data.js
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

/**
 * Demo issues designed to trigger each alert type
 */
const DEMO_ISSUES = [
  // ============================================
  // 1. MISSING DATES - Warning/Info level
  // ============================================
  {
    summary: '[Alert Demo] Missing Both Dates',
    description: 'This issue has no start date and no due date.\n\nExpected Alert: "Missing both start date and due date" (Warning)',
    alertType: 'missing_dates',
    // No startDate, no dueDate
    estimate: '8h'
  },
  {
    summary: '[Alert Demo] Missing Start Date Only',
    description: 'This issue has a due date but no start date.\n\nExpected Alert: "Missing start date" (Info)',
    alertType: 'missing_dates',
    dueDate: getDate(14),
    // No startDate
    estimate: '8h'
  },
  {
    summary: '[Alert Demo] Missing Due Date Only',
    description: 'This issue has a start date but no due date.\n\nExpected Alert: "Missing due date" (Warning)',
    alertType: 'missing_dates',
    startDate: getDate(0),
    // No dueDate
    estimate: '8h'
  },

  // ============================================
  // 2. MISSING ESTIMATE - Warning level
  // ============================================
  {
    summary: '[Alert Demo] Missing Time Estimate',
    description: 'This issue has dates but no time estimate.\n\nExpected Alert: "Missing time estimate" (Warning)',
    alertType: 'missing_estimate',
    startDate: getDate(0),
    dueDate: getDate(7)
    // No estimate
  },

  // ============================================
  // 3. OVERDUE - Warning/Error level
  // ============================================
  {
    summary: '[Alert Demo] Overdue by 3 Days',
    description: 'This issue was due 3 days ago but is still open.\n\nExpected Alert: "Overdue by 3 days" (Warning)',
    alertType: 'overdue',
    startDate: getDate(-10),
    dueDate: getDate(-3),
    estimate: '16h'
  },
  {
    summary: '[Alert Demo] Overdue by 10 Days',
    description: 'This issue was due 10 days ago - severely overdue.\n\nExpected Alert: "Overdue by 10 days" (Error)',
    alertType: 'overdue',
    startDate: getDate(-20),
    dueDate: getDate(-10),
    estimate: '8h'
  },

  // ============================================
  // 4. DONE WITH REMAINING - Error level
  // ============================================
  {
    summary: '[Alert Demo] Done But Has Remaining Work',
    description: 'This issue will be marked Done but still has remaining estimate.\n\nExpected Alert: "Marked as done but has Xh remaining" (Error)',
    alertType: 'done_with_remaining',
    startDate: getDate(-7),
    dueDate: getDate(-1),
    estimate: '16h',
    markDone: true,
    remainingEstimate: '8h'  // Half the work "remaining"
  },

  // ============================================
  // 5. CHILD AFTER PARENT - Error level
  // (These need to be created together as Epic + child)
  // ============================================
  {
    summary: '[Alert Demo] Parent Epic',
    description: 'This Epic is due Feb 15. Its child story is due Feb 28 - after the parent.\n\nThe child story will trigger: "Due X days after parent" (Error)',
    alertType: 'parent_epic',
    issueType: 'Epic',
    startDate: getDate(0),
    dueDate: getDate(14),  // Due in 2 weeks
    estimate: '40h'
  },
  {
    summary: '[Alert Demo] Child Due After Parent',
    description: 'This story is due AFTER its parent Epic.\n\nExpected Alert: "Due X days after parent EPIC-XXX" (Error)',
    alertType: 'child_after_parent',
    issueType: 'Story',
    parentSummary: '[Alert Demo] Parent Epic',  // Will be linked to the epic
    startDate: getDate(7),
    dueDate: getDate(28),  // Due 2 weeks AFTER parent
    estimate: '16h'
  },

  // ============================================
  // 6. DEPENDENCY CONFLICT - Error level
  // (These need to be created together as blocker + blocked)
  // ============================================
  {
    summary: '[Alert Demo] Blocker Task',
    description: 'This task finishes on day 14. The dependent task starts on day 7 - before this finishes.\n\nThe dependent task will trigger a dependency conflict alert.',
    alertType: 'blocker',
    startDate: getDate(0),
    dueDate: getDate(14),  // Finishes in 2 weeks
    estimate: '24h'
  },
  {
    summary: '[Alert Demo] Dependent Starts Before Blocker Finishes',
    description: 'This task starts BEFORE its blocker finishes.\n\nExpected Alert: "Blocked by XXX which finishes X days after this starts" (Error)',
    alertType: 'dependency_conflict',
    blockerSummary: '[Alert Demo] Blocker Task',  // Will be linked
    startDate: getDate(7),   // Starts day 7
    dueDate: getDate(21),    // Ends day 21
    estimate: '16h'
  },

  // ============================================
  // Clean issue for comparison
  // ============================================
  {
    summary: '[Alert Demo] Clean Issue - No Alerts',
    description: 'This issue has all required fields properly filled out.\n\nExpected: No alerts for this issue.',
    alertType: 'clean',
    startDate: getDate(0),
    dueDate: getDate(7),
    estimate: '8h'
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
 * Create an issue
 */
async function createIssue(issue) {
  const payload = {
    fields: {
      project: { key: CONFIG.projectKey },
      summary: issue.summary,
      description: issue.description,
      issuetype: { name: issue.issueType || 'Task' },
      labels: ['alert-demo', 'beyond-burndown-test', issue.alertType || 'demo']
    }
  };

  // Add time estimate
  if (issue.estimate) {
    payload.fields.timetracking = {
      originalEstimate: issue.estimate
    };
    if (issue.remainingEstimate) {
      payload.fields.timetracking.remainingEstimate = issue.remainingEstimate;
    }
  }

  // Add due date
  if (issue.dueDate) {
    payload.fields.duedate = issue.dueDate;
  }

  // Add start date (custom field - may vary by Jira instance)
  if (issue.startDate) {
    payload.fields.customfield_10015 = issue.startDate;
  }

  return await jiraRequest('POST', '/rest/api/2/issue', payload);
}

/**
 * Transition an issue to Done
 */
async function transitionToDone(issueKey) {
  // First, get available transitions
  const transResult = await jiraRequest('GET', `/rest/api/2/issue/${issueKey}/transitions`);
  if (!transResult.success) {
    return { success: false, error: 'Could not get transitions' };
  }

  // Find "Done" transition
  const doneTransition = transResult.data.transitions.find(
    t => t.name.toLowerCase() === 'done' || t.to.name.toLowerCase() === 'done'
  );

  if (!doneTransition) {
    return { success: false, error: 'No Done transition found' };
  }

  // Execute transition
  return await jiraRequest('POST', `/rest/api/2/issue/${issueKey}/transitions`, {
    transition: { id: doneTransition.id }
  });
}

/**
 * Set parent (Epic Link) for an issue
 */
async function setParent(childKey, parentKey) {
  // Try the standard parent field first (for next-gen projects)
  let result = await jiraRequest('PUT', `/rest/api/2/issue/${childKey}`, {
    fields: {
      parent: { key: parentKey }
    }
  });

  if (result.success) return result;

  // Try Epic Link custom field (classic projects)
  // Common field IDs: customfield_10014, customfield_10008
  result = await jiraRequest('PUT', `/rest/api/2/issue/${childKey}`, {
    fields: {
      customfield_10014: parentKey
    }
  });

  return result;
}

/**
 * Create a blocking link between issues
 */
async function createBlockingLink(blockerKey, blockedKey) {
  return await jiraRequest('POST', '/rest/api/2/issueLink', {
    type: { name: 'Blocks' },
    inwardIssue: { key: blockedKey },
    outwardIssue: { key: blockerKey }
  });
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Beyond Burndown - Alerts Demo Data Creator');
  console.log('='.repeat(60));
  console.log(`Jira URL: ${CONFIG.jiraUrl}`);
  console.log(`Project:  ${CONFIG.projectKey}`);
  console.log('-'.repeat(60));
  console.log('');
  console.log('This script creates issues that demonstrate all alert types:');
  console.log('  1. Missing Dates (Warning/Info)');
  console.log('  2. Missing Estimate (Warning)');
  console.log('  3. Overdue (Warning/Error)');
  console.log('  4. Done with Remaining Work (Error)');
  console.log('  5. Child After Parent (Error)');
  console.log('  6. Dependency Conflict (Error)');
  console.log('');
  console.log('-'.repeat(60));

  const created = [];
  const failed = [];
  const createdByType = {};  // Track keys by alert type for linking

  // Create all issues
  for (let i = 0; i < DEMO_ISSUES.length; i++) {
    const issue = DEMO_ISSUES[i];
    console.log(`\n[${i + 1}/${DEMO_ISSUES.length}] ${issue.summary}`);
    console.log(`    Alert Type: ${issue.alertType}`);

    try {
      const result = await createIssue(issue);

      if (result.success) {
        const issueKey = result.data.key;
        console.log(`  ✓ Created: ${issueKey}`);

        // Track by alert type for linking
        createdByType[issue.alertType] = issueKey;
        if (issue.parentSummary) {
          createdByType[`${issue.alertType}_needs_parent`] = issueKey;
        }
        if (issue.blockerSummary) {
          createdByType[`${issue.alertType}_needs_blocker`] = issueKey;
        }

        // Mark as Done if needed (for done_with_remaining test)
        if (issue.markDone) {
          const transResult = await transitionToDone(issueKey);
          if (transResult.success) {
            console.log(`  ✓ Transitioned to Done`);
          } else {
            console.log(`  ⚠ Could not transition to Done: ${transResult.error}`);
          }
        }

        created.push({
          key: issueKey,
          summary: issue.summary,
          alertType: issue.alertType,
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

  // Create relationships
  console.log('\n' + '-'.repeat(60));
  console.log('Creating Relationships...');
  console.log('-'.repeat(60));

  // Link child to parent epic
  if (createdByType['parent_epic'] && createdByType['child_after_parent_needs_parent']) {
    console.log(`\nLinking child to parent epic...`);
    const result = await setParent(
      createdByType['child_after_parent_needs_parent'],
      createdByType['parent_epic']
    );
    if (result.success) {
      console.log(`  ✓ Linked ${createdByType['child_after_parent_needs_parent']} to parent ${createdByType['parent_epic']}`);
    } else {
      console.log(`  ⚠ Could not link parent: ${result.error?.substring(0, 100) || 'Unknown'}`);
    }
  }

  // Create blocking relationship
  if (createdByType['blocker'] && createdByType['dependency_conflict_needs_blocker']) {
    console.log(`\nCreating blocking link...`);
    const result = await createBlockingLink(
      createdByType['blocker'],
      createdByType['dependency_conflict_needs_blocker']
    );
    if (result.success) {
      console.log(`  ✓ ${createdByType['blocker']} now blocks ${createdByType['dependency_conflict_needs_blocker']}`);
    } else {
      console.log(`  ⚠ Could not create blocking link: ${result.error?.substring(0, 100) || 'Unknown'}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Created: ${created.length}`);
  console.log(`Failed:  ${failed.length}`);

  if (created.length > 0) {
    console.log('\n✓ Created Issues by Alert Type:');
    console.log('-'.repeat(60));

    const alertGroups = {};
    for (const item of created) {
      if (!alertGroups[item.alertType]) {
        alertGroups[item.alertType] = [];
      }
      alertGroups[item.alertType].push(item);
    }

    for (const [alertType, items] of Object.entries(alertGroups)) {
      console.log(`\n  ${alertType.toUpperCase()}:`);
      for (const item of items) {
        console.log(`    ${item.key}: ${item.summary.substring(0, 40)}`);
      }
    }
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
  console.log('2. Configure Demand JQL to include these issues:');
  console.log(`   project = ${CONFIG.projectKey} AND labels = "alert-demo"`);
  console.log('3. Go to the Alerts tab to see all alert types');
  console.log('');
  console.log('Expected Alerts:');
  console.log('  - 3x Missing Dates (2 Warning, 1 Info)');
  console.log('  - 1x Missing Estimate (Warning)');
  console.log('  - 2x Overdue (1 Warning, 1 Error)');
  console.log('  - 1x Done with Remaining (Error)');
  console.log('  - 1x Child After Parent (Error)');
  console.log('  - 1x Dependency Conflict (Error)');
  console.log('  - 0x for Clean Issue');
  console.log('='.repeat(60));
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
