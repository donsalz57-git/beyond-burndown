// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Beyond Burndown E2E Tests - Running in Jira
 *
 * These tests run against the actual Jira instance with the gadget deployed.
 *
 * Setup:
 *   1. Run: node scripts/jira-login.js (to save auth state)
 *   2. Run: npm run test:e2e:jira
 */

const JIRA_URL = process.env.JIRA_URL || 'https://donsalz57.atlassian.net';
const JIRA_DASHBOARD_ID = process.env.JIRA_DASHBOARD_ID || '10233';

/**
 * Helper to check if we're logged in and skip test if not
 */
async function ensureLoggedIn(page, testInfo) {
  const title = await page.title();
  if (title.includes('Log in') || title.includes('Sign in')) {
    console.log('Session expired - run: node scripts/jira-login.js');
    testInfo.skip(true, 'Auth session expired');
    return false;
  }
  return true;
}

/**
 * Helper to find the Beyond Burndown gadget on the page
 * Returns null if not found
 */
async function findGadgetFrame(page) {
  // Try different selectors that Forge apps might use
  const selectors = [
    'iframe[src*="beyond-burndown"]',
    'iframe[title*="Feasibility"]',
    'iframe[src*="forge"]',
    'iframe[src*="atlassian-app"]'
  ];

  for (const selector of selectors) {
    const frame = page.locator(selector).first();
    if (await frame.isVisible({ timeout: 1000 }).catch(() => false)) {
      return page.frameLocator(selector).first();
    }
  }

  return null;
}

test.describe('Beyond Burndown in Jira', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate directly to dashboard (auth state is loaded from storageState)
    await page.goto(`${JIRA_URL}/jira/dashboards/${JIRA_DASHBOARD_ID}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
  });

  test('dashboard loads successfully', async ({ page }, testInfo) => {
    if (!await ensureLoggedIn(page, testInfo)) return;

    // Verify we're on the dashboard page
    await expect(page).toHaveURL(/dashboards/, { timeout: 15000 });

    // Wait for dashboard to fully load
    await page.waitForTimeout(5000);

    // Log iframes for debugging
    const iframes = page.locator('iframe');
    const count = await iframes.count();
    console.log(`Found ${count} iframes on dashboard`);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const src = await iframes.nth(i).getAttribute('src') || 'no-src';
      const title = await iframes.nth(i).getAttribute('title') || 'no-title';
      console.log(`  Frame ${i}: title="${title}", src="${src.substring(0, 80)}..."`);
    }
  });

  test('gadget presence check', async ({ page }, testInfo) => {
    if (!await ensureLoggedIn(page, testInfo)) return;

    await page.waitForTimeout(5000);

    // Take debug screenshot
    await page.screenshot({ path: 'test-results/dashboard-state.png', fullPage: true });

    // Try to find the gadget
    const gadgetFrame = await findGadgetFrame(page);

    if (!gadgetFrame) {
      // Check if gadget text is visible anywhere on page
      const hasGadgetText = await page.getByText(/feasibility|beyond burndown/i).first()
        .isVisible({ timeout: 3000 }).catch(() => false);

      if (hasGadgetText) {
        console.log('Found gadget text on page (may not be in iframe)');
      } else {
        console.log('Gadget not found on dashboard - deploy the gadget first:');
        console.log('  1. Run: forge deploy');
        console.log('  2. Add gadget to dashboard in Jira');
        testInfo.skip(true, 'Gadget not deployed to dashboard');
      }
    } else {
      console.log('Found Beyond Burndown gadget iframe');

      // Try to verify content inside the frame
      const hasContent = await gadgetFrame.locator('#root, .gadget-container, .loading-state')
        .isVisible({ timeout: 10000 }).catch(() => false);

      expect(hasContent, 'Gadget should have content').toBe(true);
    }
  });

  // These tests require the gadget to be deployed and visible
  test.describe('Gadget Interactions', () => {

    test('displays summary bar when configured', async ({ page }, testInfo) => {
      if (!await ensureLoggedIn(page, testInfo)) return;

      const gadgetFrame = await findGadgetFrame(page);
      if (!gadgetFrame) {
        testInfo.skip(true, 'Gadget not found on dashboard');
        return;
      }

      // Check for summary bar elements (may not exist if not configured)
      const summaryBar = gadgetFrame.locator('.summary-bar');
      if (await summaryBar.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(gadgetFrame.getByText('Issues')).toBeVisible();
        await expect(gadgetFrame.getByText('Feasibility')).toBeVisible();
      }
    });

    test('can navigate between tabs', async ({ page }, testInfo) => {
      if (!await ensureLoggedIn(page, testInfo)) return;

      const gadgetFrame = await findGadgetFrame(page);
      if (!gadgetFrame) {
        testInfo.skip(true, 'Gadget not found on dashboard');
        return;
      }

      // Wait for tabs
      const feasibilityTab = gadgetFrame.getByRole('button', { name: 'Feasibility' });
      await expect(feasibilityTab).toBeVisible({ timeout: 30000 });

      // Click Compliance tab
      await gadgetFrame.getByRole('button', { name: 'Compliance' }).click();
      await expect(gadgetFrame.getByText(/All Clear|violations/i)).toBeVisible();

      // Click back to Feasibility
      await feasibilityTab.click();
    });

    test('What-If panel opens and closes', async ({ page }, testInfo) => {
      if (!await ensureLoggedIn(page, testInfo)) return;

      const gadgetFrame = await findGadgetFrame(page);
      if (!gadgetFrame) {
        testInfo.skip(true, 'Gadget not found on dashboard');
        return;
      }

      // Click Show What-If button
      const showWhatIfBtn = gadgetFrame.getByRole('button', { name: 'Show What-If' });
      await expect(showWhatIfBtn).toBeVisible({ timeout: 30000 });
      await showWhatIfBtn.click();

      // Panel should be visible
      await expect(gadgetFrame.getByText('What-If Scenarios')).toBeVisible();

      // Close panel
      await gadgetFrame.getByRole('button', { name: 'Hide What-If' }).click();
      await expect(gadgetFrame.getByText('What-If Scenarios')).not.toBeVisible();
    });

    test('can add a What-If scenario', async ({ page }, testInfo) => {
      if (!await ensureLoggedIn(page, testInfo)) return;

      const gadgetFrame = await findGadgetFrame(page);
      if (!gadgetFrame) {
        testInfo.skip(true, 'Gadget not found on dashboard');
        return;
      }

      // Open What-If panel
      await gadgetFrame.getByRole('button', { name: 'Show What-If' }).click();
      await expect(gadgetFrame.getByText('What-If Scenarios')).toBeVisible();

      // Add a capacity scenario
      await gadgetFrame.getByRole('button', { name: 'Add' }).first().click();

      // Should show active scenarios
      await expect(gadgetFrame.getByText('Active Scenarios')).toBeVisible();
    });

    test('Export menu shows options', async ({ page }, testInfo) => {
      if (!await ensureLoggedIn(page, testInfo)) return;

      const gadgetFrame = await findGadgetFrame(page);
      if (!gadgetFrame) {
        testInfo.skip(true, 'Gadget not found on dashboard');
        return;
      }

      // Click Export button
      const exportBtn = gadgetFrame.getByRole('button', { name: 'Export' });
      await expect(exportBtn).toBeVisible({ timeout: 30000 });
      await exportBtn.click();

      // Check export options
      await expect(gadgetFrame.getByRole('button', { name: 'Copy as Text' })).toBeVisible();
    });

    test('can access Report tab', async ({ page }, testInfo) => {
      if (!await ensureLoggedIn(page, testInfo)) return;

      const gadgetFrame = await findGadgetFrame(page);
      if (!gadgetFrame) {
        testInfo.skip(true, 'Gadget not found on dashboard');
        return;
      }

      // Click Report tab
      await gadgetFrame.getByRole('button', { name: 'Report' }).click();

      // Should show status report
      await expect(gadgetFrame.getByText('Project Status Report')).toBeVisible();
    });

    test('can access Team Health tab', async ({ page }, testInfo) => {
      if (!await ensureLoggedIn(page, testInfo)) return;

      const gadgetFrame = await findGadgetFrame(page);
      if (!gadgetFrame) {
        testInfo.skip(true, 'Gadget not found on dashboard');
        return;
      }

      // Click Team tab
      await gadgetFrame.getByRole('button', { name: 'Team' }).click();

      // Should show team health content
      await expect(gadgetFrame.locator('.team-health-view, [class*="team"]')).toBeVisible();
    });

    test('can access Capacity tab', async ({ page }, testInfo) => {
      if (!await ensureLoggedIn(page, testInfo)) return;

      const gadgetFrame = await findGadgetFrame(page);
      if (!gadgetFrame) {
        testInfo.skip(true, 'Gadget not found on dashboard');
        return;
      }

      // Click Capacity tab
      await gadgetFrame.getByRole('button', { name: 'Capacity' }).click();

      // Should show capacity content
      await expect(gadgetFrame.getByText(/capacity/i)).toBeVisible();
    });
  });
});
