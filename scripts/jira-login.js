#!/usr/bin/env node
/**
 * Interactive Jira login to save browser state for E2E tests
 *
 * Run this once to login to Jira manually, then the auth state
 * will be saved and reused for subsequent test runs.
 */

const { chromium } = require('@playwright/test');

const JIRA_URL = 'https://donsalz57.atlassian.net';
const AUTH_FILE = '.auth/jira-state.json';

async function main() {
  console.log('Opening browser for Jira login...');
  console.log('');
  console.log('Please login to Jira manually in the browser window.');
  console.log('Once logged in, the browser state will be saved.');
  console.log('');

  // Use persistent context to appear more like a real browser
  // This helps bypass Google's automated browser detection
  const userDataDir = '.auth/browser-data';

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',  // Use installed Chrome instead of Chromium
    args: [
      '--disable-blink-features=AutomationControlled',  // Hide automation
    ],
  });
  const page = context.pages()[0] || await context.newPage();

  // Go to Jira
  await page.goto(`${JIRA_URL}/jira/dashboards/10233`);

  // Wait for user to login (wait for dashboard to load)
  console.log('Waiting for login... (navigate to dashboard after logging in)');

  try {
    // Wait until we're on a dashboard page (logged in)
    await page.waitForURL(/.*\/jira\/dashboards.*/, { timeout: 300000 }); // 5 min timeout

    // Additional wait to ensure fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Save auth state
    const fs = require('fs');
    const path = require('path');

    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await context.storageState({ path: AUTH_FILE });
    console.log('');
    console.log(`✓ Auth state saved to ${AUTH_FILE}`);
    console.log('');
    console.log('You can now run tests with: npm run test:e2e:jira');

  } catch (err) {
    console.error('Login timed out or failed:', err.message);
  }

  await context.close();
}

main().catch(console.error);
