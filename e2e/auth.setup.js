// @ts-check
const { test: setup, expect } = require('@playwright/test');

const JIRA_URL = process.env.JIRA_URL || 'https://donsalz57.atlassian.net';
const JIRA_DASHBOARD_ID = process.env.JIRA_DASHBOARD_ID || '10233';
const AUTH_FILE = '.auth/jira-state.json';

/**
 * Auth setup - runs before tests to ensure valid session
 */
setup('authenticate', async ({ page }) => {
  // Try to use existing session
  await page.goto(`${JIRA_URL}/jira/dashboards/${JIRA_DASHBOARD_ID}`);
  await page.waitForLoadState('load');

  // Wait a moment for redirects to complete
  await page.waitForTimeout(3000);

  // Check if we need to login
  const title = await page.title();
  const needsLogin = title.includes('Log in') || title.includes('Sign in');

  if (needsLogin) {
    console.log('Session expired - manual login required');
    console.log('Please run: node scripts/jira-login.js');
    console.log('Then re-run the tests');

    // Fail the setup to prevent tests from running without auth
    expect(needsLogin, 'Login required - run node scripts/jira-login.js first').toBe(false);
  }

  // Session is valid - verify we're on dashboard
  await expect(page).toHaveURL(/dashboards/);
  console.log('Auth session validated successfully');
});
