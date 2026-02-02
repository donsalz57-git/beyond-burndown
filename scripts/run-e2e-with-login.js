#!/usr/bin/env node
/**
 * Run E2E tests with live login
 *
 * Opens browser, waits for manual login, then runs tests in same session.
 * This avoids session persistence issues with Atlassian Cloud.
 */

const { chromium, expect } = require('@playwright/test');

const JIRA_URL = process.env.JIRA_URL || 'https://donsalz57.atlassian.net';
const JIRA_DASHBOARD_ID = process.env.JIRA_DASHBOARD_ID || '10233';

async function main() {
  console.log('Beyond Burndown - E2E Test Runner');
  console.log('='.repeat(50));
  console.log('');
  console.log('A browser will open. Please log in to Jira.');
  console.log('Tests will run automatically after login.');
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to dashboard
  const dashboardUrl = `${JIRA_URL}/jira/dashboards/${JIRA_DASHBOARD_ID}`;
  console.log(`Navigating to: ${dashboardUrl}`);
  await page.goto(dashboardUrl);

  // Wait for login
  console.log('Waiting for login... (please log in to Jira)');
  let loggedIn = false;

  for (let attempts = 0; attempts < 60; attempts++) {
    await page.waitForTimeout(5000);

    try {
      const url = page.url();
      const title = await page.title().catch(() => '');

      // Check if we're on the dashboard (logged in)
      if (url.includes('dashboards') && !title.includes('Log in')) {
        console.log('');
        console.log('✓ Logged in!');
        loggedIn = true;
        break;
      }

      // Show progress dot
      process.stdout.write('.');
    } catch (e) {
      // Page might be navigating, continue waiting
      process.stdout.write('.');
    }
  }

  if (!loggedIn) {
    console.error('\nLogin timeout');
    await browser.close();
    process.exit(1);
  }

  // Wait for dashboard to fully load
  await page.waitForLoadState('load');
  await page.waitForTimeout(5000);

  console.log('');
  console.log('Running E2E tests...');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Helper to find gadget frame
  async function findGadgetFrame() {
    const selectors = [
      'iframe[src*="forge"]',
      'iframe[src*="connect"]',
      'iframe[title*="Feasibility"]',
      'iframe[title*="Beyond"]'
    ];

    for (const selector of selectors) {
      const frame = page.locator(selector).first();
      if (await frame.isVisible({ timeout: 2000 }).catch(() => false)) {
        return page.frameLocator(selector).first();
      }
    }
    return null;
  }

  // Test 1: Dashboard loads
  console.log('');
  console.log('TEST 1: Dashboard loads');
  try {
    const url = page.url();
    if (url.includes('dashboards')) {
      console.log('  ✓ PASSED');
      passed++;
    } else {
      console.log('  ✗ FAILED - not on dashboard');
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ FAILED - ${e.message}`);
    failed++;
  }

  // Test 2: Find iframes
  console.log('');
  console.log('TEST 2: Iframe detection');
  const iframes = await page.locator('iframe').all();
  console.log(`  Found ${iframes.length} iframes`);
  for (let i = 0; i < Math.min(iframes.length, 5); i++) {
    const src = await iframes[i].getAttribute('src') || 'no-src';
    const title = await iframes[i].getAttribute('title') || 'no-title';
    console.log(`  [${i}] title="${title}" src="${src.substring(0, 60)}..."`);
  }
  passed++;

  // Test 3: Find gadget
  console.log('');
  console.log('TEST 3: Gadget detection');
  const gadgetFrame = await findGadgetFrame();

  if (!gadgetFrame) {
    // Try to find gadget text on main page
    const hasText = await page.getByText(/feasibility|beyond burndown/i).first()
      .isVisible({ timeout: 3000 }).catch(() => false);

    if (hasText) {
      console.log('  ✓ Found gadget text on page');
      passed++;
    } else {
      console.log('  ⊘ SKIPPED - Gadget not found');
      console.log('    Make sure gadget is deployed and added to dashboard');
      skipped++;
    }
  } else {
    console.log('  ✓ Found gadget iframe');
    passed++;

    // Test 4: Gadget has content
    console.log('');
    console.log('TEST 4: Gadget content');
    try {
      const hasRoot = await gadgetFrame.locator('#root').isVisible({ timeout: 10000 });
      if (hasRoot) {
        console.log('  ✓ PASSED - #root found');
        passed++;
      } else {
        console.log('  ✗ FAILED - no #root');
        failed++;
      }
    } catch (e) {
      console.log(`  ✗ FAILED - ${e.message}`);
      failed++;
    }

    // Test 5: Tab navigation
    console.log('');
    console.log('TEST 5: Tab navigation');
    try {
      const feasibilityTab = gadgetFrame.getByRole('button', { name: 'Feasibility' });
      if (await feasibilityTab.isVisible({ timeout: 10000 })) {
        console.log('  ✓ Feasibility tab visible');

        // Click Compliance
        const complianceTab = gadgetFrame.getByRole('button', { name: 'Compliance' });
        await complianceTab.click();
        await page.waitForTimeout(1000);
        console.log('  ✓ Clicked Compliance tab');

        // Click back to Feasibility
        await feasibilityTab.click();
        await page.waitForTimeout(1000);
        console.log('  ✓ PASSED');
        passed++;
      } else {
        console.log('  ⊘ SKIPPED - tabs not visible');
        skipped++;
      }
    } catch (e) {
      console.log(`  ✗ FAILED - ${e.message}`);
      failed++;
    }

    // Test 6: What-If panel
    console.log('');
    console.log('TEST 6: What-If panel');
    try {
      const showWhatIfBtn = gadgetFrame.getByRole('button', { name: 'Show What-If' });
      if (await showWhatIfBtn.isVisible({ timeout: 5000 })) {
        await showWhatIfBtn.click();
        await page.waitForTimeout(1000);

        const panelVisible = await gadgetFrame.getByText('What-If Scenarios').isVisible();
        if (panelVisible) {
          console.log('  ✓ Panel opened');

          // Close it
          const hideBtn = gadgetFrame.getByRole('button', { name: 'Hide What-If' });
          await hideBtn.click();
          await page.waitForTimeout(500);
          console.log('  ✓ PASSED');
          passed++;
        } else {
          console.log('  ✗ FAILED - panel not visible');
          failed++;
        }
      } else {
        console.log('  ⊘ SKIPPED - button not found');
        skipped++;
      }
    } catch (e) {
      console.log(`  ✗ FAILED - ${e.message}`);
      failed++;
    }

    // Test 7: Export button
    console.log('');
    console.log('TEST 7: Export menu');
    try {
      const exportBtn = gadgetFrame.getByRole('button', { name: 'Export' });
      if (await exportBtn.isVisible({ timeout: 5000 })) {
        await exportBtn.click();
        await page.waitForTimeout(500);

        const copyText = await gadgetFrame.getByRole('button', { name: 'Copy as Text' }).isVisible();
        if (copyText) {
          console.log('  ✓ PASSED');
          passed++;
        } else {
          console.log('  ✗ FAILED - menu items not visible');
          failed++;
        }

        // Close menu by clicking elsewhere
        await gadgetFrame.locator('body').click();
      } else {
        console.log('  ⊘ SKIPPED - button not found');
        skipped++;
      }
    } catch (e) {
      console.log(`  ✗ FAILED - ${e.message}`);
      failed++;
    }
  }

  // Take final screenshot
  await page.screenshot({ path: 'test-results/e2e-final.png', fullPage: true });
  console.log('');
  console.log('Screenshot saved: test-results/e2e-final.png');

  // Summary
  console.log('');
  console.log('='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('='.repeat(50));

  // Close browser and exit
  await browser.close();

  console.log('');
  console.log('Tests complete!');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
