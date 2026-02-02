# E2E Tests for Beyond Burndown

End-to-end tests for the Beyond Burndown Jira gadget using Playwright.

## Setup

### Prerequisites
- Node.js 18+
- Playwright installed (`npm install`)
- Access to a Jira Cloud instance with the gadget deployed
- **Atlassian account with password** (not Google OAuth)

### Setting Up Atlassian Password

If you currently use "Sign in with Google", you need to set up a password:

1. Go to https://id.atlassian.com/manage-profile/security
2. Under "Password", click "Create password" or "Set password"
3. Create a strong password
4. You can now log in with email + password

### Authentication

#### Option 1: Automated Login (Recommended)

```bash
# Set your credentials
set JIRA_EMAIL=your@email.com
set JIRA_PASSWORD=your-atlassian-password

# Run the login script
node scripts/jira-login.js
```

The script will:
1. Open a browser
2. Navigate to Jira
3. Fill in your email and password
4. Save the session to `.auth/jira-state.json`

#### Option 2: Interactive Login

If automated login doesn't work, use interactive mode:

```bash
node scripts/jira-login.js --interactive
```

This opens a browser where you log in manually.

### Why Not Google OAuth?

Google detects and blocks automated browsers from completing OAuth login. You'll see "Couldn't sign you in - This browser or app may not be secure". Using Atlassian email/password avoids this limitation.

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
