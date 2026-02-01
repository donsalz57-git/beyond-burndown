# Issue: Set up E2E Testing Infrastructure with Playwright

**Project:** BB
**Type:** Task
**Priority:** Medium

---

## Summary
Set up end-to-end testing infrastructure using Playwright to test the Beyond Burndown gadget UI.

## Description

### Background
We need E2E tests to verify the gadget functionality works correctly across browsers and simulates real user interactions. Unit tests are in place (440 total), but we need integration/E2E tests for complete coverage.

### Tasks
- [x] Install Playwright and configure for the project
- [x] Create initial E2E test suite covering:
  - Gadget loading states (loading, error, success)
  - Tab navigation (Feasibility, Scope, Team, Capacity, Compliance, Dependencies, Report)
  - Summary bar display (Issues, Feasibility %, Violations, Cycles)
  - What-If panel functionality (add/remove capacity, scope, deadline scenarios)
  - Export menu (Copy as Text, Markdown, Download)
  - Feasibility chart aggregation controls
  - Accessibility checks
- [ ] Set up Forge bridge mocking for local testing
- [ ] Add CI/CD pipeline integration for E2E tests
- [ ] Create tests for Jira integration scenarios
- [ ] Add visual regression testing

### Test Files Created
| File | Description |
|------|-------------|
| `e2e/gadget.spec.js` | Main gadget UI tests (25+ test cases) |
| `e2e/fixtures/forge-mock.js` | Mock data helpers for testing |
| `playwright.config.js` | Playwright configuration |

### How to Run
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run headed (visible browser)
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

### Browser Coverage
Tests run against:
- Chromium (Chrome, Edge)
- Firefox
- WebKit (Safari)

## Acceptance Criteria
1. E2E tests pass in CI/CD pipeline
2. Tests cover all main user flows
3. Tests work with mocked Forge bridge (no Jira connection required)
4. Visual regression tests catch UI changes
5. Test report is generated and accessible

## Notes
- Tests currently require the frontend dev server running at localhost:3000
- Forge bridge mocking is needed for tests to work without Jira connection
- Consider adding tests for different viewport sizes (mobile, tablet)
- Current test counts: 238 backend + 202 frontend = 440 unit/integration tests

## Labels
`testing`, `e2e`, `playwright`, `infrastructure`

---

*Copy this content to create the issue in the BB Jira project.*
