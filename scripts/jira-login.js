#!/usr/bin/env node
/**
 * Jira login script for E2E tests
 *
 * Logs in using Atlassian email/password and saves browser state.
 *
 * Environment variables:
 *   JIRA_EMAIL    - Atlassian account email
 *   JIRA_PASSWORD - Atlassian account password
 *   JIRA_URL      - Jira instance URL (optional)
 *
 * Usage:
 *   set JIRA_EMAIL=your@email.com
 *   set JIRA_PASSWORD=your-password
 *   node scripts/jira-login.js
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const JIRA_URL = process.env.JIRA_URL || 'https://donsalz57.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL || '';
const JIRA_PASSWORD = process.env.JIRA_PASSWORD || '';
const AUTH_FILE = '.auth/jira-state.json';

async function main() {
  console.log('Beyond Burndown - Jira Login');
  console.log('='.repeat(40));
  console.log('');

  // Check for credentials
  if (!JIRA_EMAIL || !JIRA_PASSWORD) {
    console.log('Credentials not provided. Set environment variables:');
    console.log('');
    console.log('  set JIRA_EMAIL=your@email.com');
    console.log('  set JIRA_PASSWORD=your-password');
    console.log('  node scripts/jira-login.js');
    console.log('');
    console.log('Or run in interactive mode (manual login):');
    console.log('  node scripts/jira-login.js --interactive');
    console.log('');

    if (process.argv.includes('--interactive')) {
      return await interactiveLogin();
    }
    process.exit(1);
  }

  console.log(`Email: ${JIRA_EMAIL}`);
  console.log(`URL: ${JIRA_URL}`);
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to Jira (will redirect to login)
    console.log('Navigating to Jira...');
    await page.goto(`${JIRA_URL}/jira/dashboards`);
    await page.waitForLoadState('load');

    // Wait for login form
    console.log('Waiting for login form...');
    await page.waitForSelector('input#username', { timeout: 30000 });

    // Enter email
    console.log('Entering email...');
    await page.fill('input#username', JIRA_EMAIL);
    await page.click('button#login-submit');

    // Wait for password field (Atlassian uses two-step login)
    console.log('Waiting for password field...');
    await page.waitForSelector('input#password', { timeout: 30000 });

    // Enter password
    console.log('Entering password...');
    await page.fill('input#password', JIRA_PASSWORD);
    await page.click('button#login-submit');

    // Wait for redirect to Jira (successful login)
    console.log('Waiting for login to complete...');
    await page.waitForURL(/.*\/jira\/.*|.*\/secure\/.*|.*dashboard.*/, { timeout: 60000 });

    // Wait for page to fully load
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    // Verify we're logged in
    const url = page.url();
    if (url.includes('login') || url.includes('signin')) {
      throw new Error('Login failed - still on login page');
    }

    // Save auth state
    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await context.storageState({ path: AUTH_FILE });

    console.log('');
    console.log('✓ Login successful!');
    console.log(`✓ Auth state saved to ${AUTH_FILE}`);
    console.log('');
    console.log('You can now run tests:');
    console.log('  npm run test:e2e:jira');

  } catch (err) {
    console.error('');
    console.error('✗ Login failed:', err.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Verify your email and password are correct');
    console.error('  2. Make sure you have an Atlassian password set (not just Google OAuth)');
    console.error('  3. Visit https://id.atlassian.com/manage-profile/security to set a password');
    console.error('');

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/login-error.png' });
    console.error('Screenshot saved to: test-results/login-error.png');

    process.exit(1);
  } finally {
    await browser.close();
  }
}

/**
 * Interactive login - opens browser for manual login
 */
async function interactiveLogin() {
  console.log('Opening browser for manual login...');
  console.log('Please log in to Jira in the browser window.');
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${JIRA_URL}/jira/dashboards`);

  console.log('Waiting for login... (navigate to dashboard after logging in)');

  try {
    // Wait until we're on a dashboard page (logged in)
    await page.waitForURL(/.*\/jira\/dashboards.*/, { timeout: 300000 }); // 5 min timeout

    // Additional wait to ensure fully loaded
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Save auth state
    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await context.storageState({ path: AUTH_FILE });

    console.log('');
    console.log(`✓ Auth state saved to ${AUTH_FILE}`);
    console.log('');
    console.log('You can now run tests: npm run test:e2e:jira');

  } catch (err) {
    console.error('Login timed out or failed:', err.message);
  }

  await browser.close();
}

main().catch(console.error);
