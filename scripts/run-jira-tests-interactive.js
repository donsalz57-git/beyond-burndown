#!/usr/bin/env node
/**
 * Interactive Jira E2E test runner
 *
 * Opens browser for manual login, then runs tests in the same browser context.
 * This avoids session expiration issues with Atlassian Cloud.
 */

const { chromium } = require('@playwright/test');

const JIRA_URL = process.env.JIRA_URL || 'https://donsalz57.atlassian.net';
const JIRA_DASHBOARD_ID = process.env.JIRA_DASHBOARD_ID || '10233';

async function main() {
  console.log('='.repeat(60));
  console.log('Beyond Burndown - Interactive E2E Test Runner');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. A browser will open to Jira');
  console.log('2. Log in manually if needed');
  console.log('3. Tests will run automatically once logged in');
  console.log('');

  // Use persistent context with real Chrome to bypass Google's automation detection
  const userDataDir = '.auth/browser-data';

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',  // Use installed Chrome
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] || await context.newPage();

  // Go to dashboard
  console.log(`Navigating to: ${JIRA_URL}/jira/dashboards/${JIRA_DASHBOARD_ID}`);
  await page.goto(`${JIRA_URL}/jira/dashboards/${JIRA_DASHBOARD_ID}`);

  // Wait for login if needed
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max wait

  while (attempts < maxAttempts) {
    await page.waitForTimeout(5000);
    const title = await page.title();

    if (!title.includes('Log in') && !title.includes('Sign in')) {
      console.log('');
      console.log('✓ Logged in successfully!');
      break;
    }

    if (attempts === 0) {
      console.log('Waiting for login... (please log in to Jira in the browser)');
    }
    attempts++;
  }

  if (attempts >= maxAttempts) {
    console.error('Login timeout - please try again');
    await context.close();
    process.exit(1);
  }

  // Wait for page to fully load
  await page.waitForLoadState('load');
  await page.waitForTimeout(5000);

  console.log('');
  console.log('Running diagnostic tests...');
  console.log('-'.repeat(40));

  // Test 1: Dashboard loaded
  console.log('');
  console.log('TEST 1: Dashboard loads');
  const url = page.url();
  if (url.includes('dashboards')) {
    console.log('  ✓ Dashboard URL confirmed');
  } else {
    console.log('  ✗ Not on dashboard page');
  }

  // Test 2: Find iframes
  console.log('');
  console.log('TEST 2: Iframe detection');
  const iframes = await page.locator('iframe').all();
  console.log(`  Found ${iframes.length} iframes on page:`);

  for (let i = 0; i < iframes.length; i++) {
    const src = await iframes[i].getAttribute('src') || 'no-src';
    const title = await iframes[i].getAttribute('title') || 'no-title';
    const id = await iframes[i].getAttribute('id') || 'no-id';
    console.log(`  [${i}] id="${id}" title="${title}"`);
    console.log(`      src="${src.substring(0, 100)}${src.length > 100 ? '...' : ''}"`);
  }

  // Test 3: Look for gadget text
  console.log('');
  console.log('TEST 3: Gadget text detection');

  const textPatterns = [
    'Feasibility',
    'Beyond Burndown',
    'Compliance',
    'What-If',
    'Not configured'
  ];

  for (const pattern of textPatterns) {
    const found = await page.getByText(pattern, { exact: false }).first()
      .isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  "${pattern}": ${found ? '✓ found' : '✗ not found'}`);
  }

  // Test 4: Look for Forge gadget containers
  console.log('');
  console.log('TEST 4: Gadget container detection');

  const selectors = [
    '[data-testid*="gadget"]',
    '[class*="gadget"]',
    '[data-gadget-id]',
    'div[data-ds--page-layout--slot]',
    '[class*="dashboard"]'
  ];

  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`  ${selector}: ${count} elements`);
    }
  }

  // Take screenshot
  console.log('');
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'test-results/dashboard-interactive.png', fullPage: true });
  console.log('  Saved to: test-results/dashboard-interactive.png');

  // Test 5: Try to interact with gadget if found
  console.log('');
  console.log('TEST 5: Gadget interaction');

  // Look for Forge iframe pattern
  const forgeIframe = page.locator('iframe[src*="forge"], iframe[src*="connect"]').first();
  const hasForgeIframe = await forgeIframe.isVisible({ timeout: 3000 }).catch(() => false);

  if (hasForgeIframe) {
    console.log('  Found Forge iframe!');
    const src = await forgeIframe.getAttribute('src');
    console.log(`  src: ${src}`);

    // Try to access content
    const frame = page.frameLocator('iframe[src*="forge"], iframe[src*="connect"]').first();
    const hasRoot = await frame.locator('#root').isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Has #root: ${hasRoot}`);
  } else {
    console.log('  No Forge iframe found');
    console.log('  Looking for embedded gadget content...');

    // Maybe the gadget is rendered directly (Custom UI)
    const feasibilityBtn = page.getByRole('button', { name: /feasibility/i }).first();
    const hasFeasibilityBtn = await feasibilityBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Feasibility button: ${hasFeasibilityBtn ? '✓ found' : '✗ not found'}`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Tests complete. Browser will stay open for inspection.');
  console.log('Press Ctrl+C to close.');
  console.log('='.repeat(60));

  // Keep browser open for manual inspection
  await new Promise(() => {}); // Wait forever until Ctrl+C
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
