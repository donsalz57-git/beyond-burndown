#!/usr/bin/env node
/**
 * Run E2E tests against Jira
 * Sets environment variables and runs Playwright
 */

const { spawn } = require('child_process');

// Configuration - update these or set as environment variables
const config = {
  JIRA_URL: process.env.JIRA_URL || 'https://donsalz57.atlassian.net',
  JIRA_EMAIL: process.env.JIRA_EMAIL || 'donsalz57@gmail.com',
  JIRA_PASSWORD: process.env.JIRA_PASSWORD || process.env.JIRA_API_TOKEN || '',
  JIRA_DASHBOARD_ID: process.env.JIRA_DASHBOARD_ID || '10233'
};

// Check for password/token
if (!config.JIRA_PASSWORD) {
  console.error('ERROR: JIRA_PASSWORD or JIRA_API_TOKEN environment variable required');
  console.error('');
  console.error('Usage:');
  console.error('  set JIRA_API_TOKEN=your-token');
  console.error('  node scripts/run-jira-tests.js');
  process.exit(1);
}

console.log('Running E2E tests against Jira...');
console.log(`  URL: ${config.JIRA_URL}`);
console.log(`  Email: ${config.JIRA_EMAIL}`);
console.log(`  Dashboard: ${config.JIRA_DASHBOARD_ID}`);
console.log('');

// Build environment
const env = {
  ...process.env,
  ...config
};

// Determine if headed mode
const headed = process.argv.includes('--headed') ? ['--headed'] : [];

// Run Playwright
const args = ['playwright', 'test', '--config=playwright.jira.config.js', ...headed];
const child = spawn('npx', args, {
  env,
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});
