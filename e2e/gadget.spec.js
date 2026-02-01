// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Beyond Burndown E2E Tests
 *
 * These tests verify the gadget UI functionality in isolation.
 * For full Jira integration tests, see jira-integration.spec.js
 */

test.describe('Gadget Loading', () => {
  test('should display loading state initially', async ({ page }) => {
    // Mock the Forge bridge to simulate loading
    await page.addInitScript(() => {
      window.__FORGE_BRIDGE_MOCK__ = {
        loading: true,
        data: null
      };
    });

    await page.goto('/');

    // Should show loading spinner
    await expect(page.locator('.loading-state')).toBeVisible();
    await expect(page.getByText('Analyzing project data...')).toBeVisible();
  });

  test('should display error state when data fetch fails', async ({ page }) => {
    await page.addInitScript(() => {
      window.__FORGE_BRIDGE_MOCK__ = {
        loading: false,
        error: 'Failed to connect to Jira'
      };
    });

    await page.goto('/');

    await expect(page.getByText('Error loading data')).toBeVisible();
    await expect(page.getByText('Failed to connect to Jira')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });
});

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful data load
    await page.addInitScript(() => {
      window.__FORGE_BRIDGE_MOCK__ = {
        loading: false,
        data: {
          envelope: {
            timeline: [{ date: '2024-01-15', capacity: 8, demand: 6 }],
            feasibilityScore: 85,
            totals: { totalCapacity: 100, totalDemand: 80, totalDays: 20 }
          },
          compliance: { violations: [], summary: { total: 0 } },
          dependencies: { dependencies: [], circularDependencies: [] },
          summary: { totalDemandIssues: 25, feasibilityScore: 85, totalViolations: 0 }
        },
        config: { demandJql: 'project = TEST' }
      };
    });
    await page.goto('/');
  });

  test('should show all navigation tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Feasibility' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scope' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Team' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Capacity' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compliance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dependencies' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Report' })).toBeVisible();
  });

  test('should switch to Compliance tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Compliance' }).click();
    await expect(page.getByText('All Clear!')).toBeVisible();
  });

  test('should switch to Dependencies tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Dependencies' }).click();
    await expect(page.getByText('dependencies')).toBeVisible();
  });

  test('should switch to Report tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Report' }).click();
    await expect(page.getByText('Project Status Report')).toBeVisible();
  });
});

test.describe('Summary Bar', () => {
  test('should display summary metrics', async ({ page }) => {
    await page.addInitScript(() => {
      window.__FORGE_BRIDGE_MOCK__ = {
        loading: false,
        data: {
          envelope: {
            timeline: [],
            feasibilityScore: 75,
            totals: { totalCapacity: 100, totalDemand: 120, totalDays: 20 }
          },
          compliance: { violations: [], summary: { total: 3 } },
          dependencies: { dependencies: [], circularDependencies: [{ issues: ['A', 'B'] }] },
          summary: { totalDemandIssues: 42, feasibilityScore: 75, totalViolations: 3, circularDependencies: 1 }
        },
        config: {}
      };
    });

    await page.goto('/');

    // Check issue count
    await expect(page.getByText('42')).toBeVisible();
    await expect(page.getByText('Issues')).toBeVisible();

    // Check feasibility
    await expect(page.getByText('75%')).toBeVisible();

    // Check violations
    await expect(page.getByText('3')).toBeVisible();
    await expect(page.getByText('Violations')).toBeVisible();

    // Check cycles
    await expect(page.getByText('1')).toBeVisible();
    await expect(page.getByText('Cycles')).toBeVisible();
  });
});

test.describe('What-If Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FORGE_BRIDGE_MOCK__ = {
        loading: false,
        data: {
          envelope: {
            timeline: [{ date: '2024-01-15', capacity: 8, demand: 6 }],
            feasibilityScore: 70,
            totals: { totalCapacity: 100, totalDemand: 120, totalDays: 20 }
          },
          compliance: { violations: [], summary: { total: 0 } },
          dependencies: { dependencies: [], circularDependencies: [] },
          summary: { totalDemandIssues: 25, feasibilityScore: 70, totalViolations: 0 }
        },
        config: {}
      };
    });
    await page.goto('/');
  });

  test('should toggle What-If panel visibility', async ({ page }) => {
    // Panel should be hidden initially
    await expect(page.getByText('What-If Scenarios')).not.toBeVisible();

    // Click Show What-If button
    await page.getByRole('button', { name: 'Show What-If' }).click();

    // Panel should be visible
    await expect(page.getByText('What-If Scenarios')).toBeVisible();

    // Button text should change
    await expect(page.getByRole('button', { name: 'Hide What-If' })).toBeVisible();
  });

  test('should show scenario type tabs', async ({ page }) => {
    await page.getByRole('button', { name: 'Show What-If' }).click();

    await expect(page.getByRole('button', { name: 'Capacity' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scope' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Deadline' })).toBeVisible();
  });

  test('should show add/remove capacity options', async ({ page }) => {
    await page.getByRole('button', { name: 'Show What-If' }).click();

    await expect(page.getByRole('button', { name: 'Add Capacity' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Capacity' })).toBeVisible();
  });

  test('should add a capacity scenario', async ({ page }) => {
    await page.getByRole('button', { name: 'Show What-If' }).click();

    // Add a scenario
    await page.getByRole('button', { name: 'Add' }).click();

    // Should show Active Scenarios section
    await expect(page.getByText('Active Scenarios')).toBeVisible();

    // Should show scenario indicator
    await expect(page.getByText(/viewing 1 scenario/i)).toBeVisible();
  });

  test('should toggle scope change type', async ({ page }) => {
    await page.getByRole('button', { name: 'Show What-If' }).click();

    // Switch to Scope tab
    await page.getByRole('button', { name: 'Scope' }).click();

    // Should show Remove Scope and Add Scope options
    await expect(page.getByRole('button', { name: 'Remove Scope' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Scope' })).toBeVisible();

    // Click Add Scope
    await page.getByRole('button', { name: 'Add Scope' }).click();

    // Add Scope should now be selected (has red styling)
    const addScopeBtn = page.getByRole('button', { name: 'Add Scope' });
    await expect(addScopeBtn).toHaveCSS('border-color', 'rgb(222, 53, 11)');
  });

  test('should clear all scenarios', async ({ page }) => {
    await page.getByRole('button', { name: 'Show What-If' }).click();

    // Add two scenarios
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByRole('button', { name: 'Scope' }).click();
    await page.getByRole('button', { name: 'Add' }).click();

    // Should show 2 scenarios
    await expect(page.getByText(/viewing 2 scenario/i)).toBeVisible();

    // Click Clear All in the scenario indicator
    const clearButtons = page.getByRole('button', { name: 'Clear All' });
    await clearButtons.last().click();

    // Scenarios should be cleared
    await expect(page.getByText(/viewing.*scenario/i)).not.toBeVisible();
  });
});

test.describe('Export Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FORGE_BRIDGE_MOCK__ = {
        loading: false,
        data: {
          envelope: {
            timeline: [],
            feasibilityScore: 85,
            totals: { totalCapacity: 100, totalDemand: 80, totalDays: 20 }
          },
          compliance: { violations: [], summary: { total: 0 } },
          dependencies: { dependencies: [], circularDependencies: [] },
          statusReport: {
            headline: { feasibility: { score: 85 } },
            schedule: { deadline: '2024-03-01' }
          },
          summary: { totalDemandIssues: 25, feasibilityScore: 85, totalViolations: 0 }
        },
        config: {}
      };
    });
    await page.goto('/');
  });

  test('should show export dropdown', async ({ page }) => {
    await page.getByRole('button', { name: 'Export' }).click();

    await expect(page.getByRole('button', { name: 'Copy as Text' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy as Markdown' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download .txt' })).toBeVisible();
  });
});

test.describe('Feasibility Chart', () => {
  test('should display chart with aggregation controls', async ({ page }) => {
    await page.addInitScript(() => {
      window.__FORGE_BRIDGE_MOCK__ = {
        loading: false,
        data: {
          envelope: {
            timeline: [
              { date: '2024-01-15', capacity: 8, demand: 6, cumulativeCapacity: 8, cumulativeDemand: 6 },
              { date: '2024-01-16', capacity: 8, demand: 7, cumulativeCapacity: 16, cumulativeDemand: 13 }
            ],
            feasibilityScore: 85,
            totals: { totalCapacity: 100, totalDemand: 80, totalDays: 20 }
          },
          compliance: { violations: [], summary: { total: 0 } },
          dependencies: { dependencies: [], circularDependencies: [] },
          summary: { totalDemandIssues: 25, feasibilityScore: 85, totalViolations: 0 }
        },
        config: {}
      };
    });

    await page.goto('/');

    // Check aggregation buttons exist
    await expect(page.getByRole('button', { name: 'Daily' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Weekly' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Monthly' })).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.addInitScript(() => {
      window.__FORGE_BRIDGE_MOCK__ = {
        loading: false,
        data: {
          envelope: { timeline: [], feasibilityScore: 85, totals: {} },
          compliance: { violations: [], summary: { total: 0 } },
          dependencies: { dependencies: [], circularDependencies: [] },
          summary: { totalDemandIssues: 25, feasibilityScore: 85, totalViolations: 0 }
        },
        config: {}
      };
    });

    await page.goto('/');

    // Navigate to Report tab which has headings
    await page.getByRole('button', { name: 'Report' }).click();

    // Check for main heading
    await expect(page.getByRole('heading', { name: 'Project Status Report' })).toBeVisible();
  });

  test('should have keyboard navigable tabs', async ({ page }) => {
    await page.addInitScript(() => {
      window.__FORGE_BRIDGE_MOCK__ = {
        loading: false,
        data: {
          envelope: { timeline: [], feasibilityScore: 85, totals: {} },
          compliance: { violations: [], summary: { total: 0 } },
          dependencies: { dependencies: [], circularDependencies: [] },
          summary: { totalDemandIssues: 25, feasibilityScore: 85, totalViolations: 0 }
        },
        config: {}
      };
    });

    await page.goto('/');

    // Focus on first tab
    await page.getByRole('button', { name: 'Feasibility' }).focus();

    // Tab to next button
    await page.keyboard.press('Tab');

    // Should focus on Scope tab
    const scopeTab = page.getByRole('button', { name: 'Scope' });
    await expect(scopeTab).toBeFocused();
  });
});
