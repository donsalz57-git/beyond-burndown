// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Beyond Burndown E2E tests against Jira
 */
module.exports = defineConfig({
  testDir: './e2e',
  testMatch: 'jira-gadget.spec.js',

  // Run tests serially for Jira (shared login state)
  fullyParallel: false,
  workers: 1,

  // Longer timeouts for Jira
  timeout: 60000,
  expect: {
    timeout: 10000
  },

  // Fail the build on CI if test.only is left in code
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // Shared settings
  use: {
    // Base URL
    baseURL: 'https://donsalz57.atlassian.net',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Slow down actions for stability
    actionTimeout: 15000,
  },

  // Projects: first run setup to validate auth, then run tests
  projects: [
    // Setup project - validates auth before tests
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      use: {
        ...devices['Desktop Chrome'],
        // Setup uses its own storage state to validate
        storageState: '.auth/jira-state.json',
      },
    },
    // Main tests - depend on setup and use saved auth state
    {
      name: 'chromium',
      testMatch: /jira-gadget\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        // Use auth state saved by setup
        storageState: '.auth/jira-state.json',
      },
      dependencies: ['setup'],
    },
  ],
});
