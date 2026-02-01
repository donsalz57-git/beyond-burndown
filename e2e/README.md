# E2E Tests for Beyond Burndown

End-to-end tests for the Beyond Burndown Jira gadget using Playwright.

## Setup

### Prerequisites
- Node.js 18+
- Playwright installed (`npm install`)
- Access to a Jira Cloud instance with the gadget deployed

### Authentication

The tests require authentication to Jira Cloud. Due to Google OAuth's security measures that block automated browsers, authentication requires manual setup.

#### Option 1: Manual Browser Login (Recommended)

```bash
# Run the login script - a Chrome browser will open
node scripts/jira-login.js

# Log in manually in the browser
# The session will be saved to .auth/jira-state.json
```

#### Option 2: Non-Google Atlassian Account

If your Jira uses Atlassian ID (email/password) instead of Google OAuth, the login script will work directly.

### Known Limitations

**Google OAuth Blocking**: Google detects and blocks automated browsers from completing OAuth login. If you see "Couldn't sign you in - This browser or app may not be secure", you need to:

1. Use a non-Google Atlassian account, OR
2. Manually log in through a real browser and export cookies, OR
3. Use API-based testing instead of UI E2E tests

## Running Tests

```bash
# Run all Jira E2E tests (headless)
npm run test:e2e:jira

# Run with visible browser
npm run test:e2e:jira:headed

# Run specific test
npx playwright test --config=playwright.jira.config.js -g "dashboard loads"
```

## Test Structure

- `auth.setup.js` - Validates authentication before running tests
- `jira-gadget.spec.js` - Main E2E tests for the gadget

### Test Cases

1. **Dashboard loads successfully** - Verifies Jira dashboard loads
2. **Gadget presence check** - Detects if the gadget is deployed
3. **Tab navigation** - Tests switching between Feasibility, Compliance, etc.
4. **What-If panel** - Tests scenario panel open/close
5. **Export menu** - Tests export functionality
6. **Report tab** - Tests status report generation
7. **Team Health tab** - Tests team health view
8. **Capacity tab** - Tests capacity configuration

## Configuration

Environment variables (optional):
- `JIRA_URL` - Jira instance URL (default: https://donsalz57.atlassian.net)
- `JIRA_DASHBOARD_ID` - Dashboard ID (default: 10233)

## Troubleshooting

### Tests skip with "Auth session expired"
Run `node scripts/jira-login.js` to refresh the session.

### Tests skip with "Gadget not found"
Ensure the Beyond Burndown gadget is:
1. Deployed: `forge deploy`
2. Added to the dashboard in Jira

### "Couldn't sign you in" error
This is Google blocking automated browsers. See "Known Limitations" above.
