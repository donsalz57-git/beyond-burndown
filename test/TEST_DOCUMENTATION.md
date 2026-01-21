# Beyond Burndown - Test Documentation

## Overview

Beyond Burndown has a comprehensive test suite consisting of **265 automated tests** and **33 manual test cases**. This document provides a complete reference for all testing activities.

---

## Test Summary

| Category | Tests | Coverage |
|----------|-------|----------|
| Backend Automated | 176 | 96.31% statements |
| Frontend Automated | 89 | 83.73% statements |
| Manual Test Cases | 33 | N/A |
| **Total** | **298** | |

---

## Part 1: Automated Tests

### Running Tests

```bash
# Backend tests
cd "Beyond burndown"
npm test                    # Run all backend tests
npm run test:coverage       # Run with coverage report
npm run test:watch          # Watch mode

# Frontend tests
cd "Beyond burndown/static/frontend"
npm test                    # Run all frontend tests
npm test -- --coverage      # Run with coverage report
```

---

### Backend Tests (176 tests)

#### 1. Utility Tests

##### businessDays.test.js (15 tests)
Tests for business day calculations used in capacity/demand spreading.

| Test | Description |
|------|-------------|
| identifies weekdays correctly | Monday-Friday are business days |
| identifies weekends correctly | Saturday/Sunday are not business days |
| counts business days in a week | 5 business days Mon-Fri |
| counts business days across weekends | Correct count spanning weekends |
| handles same day range | Single day returns 1 if weekday |
| handles weekend-only range | Returns 0 for Sat-Sun |
| spreads hours evenly across days | 40h over 5 days = 8h/day |
| handles partial day spreading | Fractional hours distributed correctly |
| handles single day spreading | All hours on one day |
| returns empty for weekend-only range | No spreading on weekends |
| handles dates crossing month boundary | Correct across Jan-Feb |
| handles dates crossing year boundary | Correct across Dec-Jan |
| handles leap year | Feb 29 counted correctly |
| getBusinessDaysInRange returns array | Returns date objects |
| spreads zero hours | Returns zeros for all days |

##### dateUtils.test.js (20 tests)
Tests for date parsing, formatting, and manipulation.

| Test | Description |
|------|-------------|
| parseJiraDate handles YYYY-MM-DD | Standard date format |
| parseJiraDate handles ISO format | Full ISO 8601 timestamp |
| parseJiraDate handles null | Returns null |
| parseJiraDate handles undefined | Returns null |
| parseJiraDate handles invalid | Returns null for bad input |
| formatDisplayDate formats correctly | "Jan 20" format |
| formatDisplayDate handles null | Returns empty string |
| formatISODate formats correctly | YYYY-MM-DD format |
| secondsToHours converts correctly | 3600s = 1h |
| secondsToHours handles null | Returns 0 |
| secondsToHours handles zero | Returns 0 |
| secondsToHours rounds to 2 decimals | Precision handling |
| getDateRange finds min/max | Correct range from array |
| getDateRange handles single date | Same start/end |
| getDateRange handles empty | Returns nulls |
| addDays adds correctly | Date arithmetic |
| addDays handles negative | Subtraction works |
| isSameDay compares correctly | Same day detection |
| isSameDay handles different days | Detects differences |
| getWeekNumber calculates correctly | ISO week numbers |

##### graphUtils.test.js (18 tests)
Tests for dependency graph algorithms.

| Test | Description |
|------|-------------|
| buildAdjacencyList creates map | Correct structure |
| buildAdjacencyList handles empty | Empty map returned |
| buildAdjacencyList handles no links | Nodes with empty arrays |
| buildAdjacencyList only includes blocks | Ignores blocked_by |
| detectCircularDependencies finds simple cycle | A→B→A detected |
| detectCircularDependencies finds longer cycle | A→B→C→A detected |
| detectCircularDependencies returns empty for acyclic | No false positives |
| detectCircularDependencies handles disconnected | Multiple components |
| topologicalSort orders correctly | Respects dependencies |
| topologicalSort handles multiple roots | All valid orderings |
| topologicalSort detects cycle | hasCycle flag set |
| topologicalSort handles empty | Empty array returned |
| topologicalSort handles single node | Returns single item |
| findRoots identifies nodes without incoming | Correct roots found |
| findLeaves identifies nodes without outgoing | Correct leaves found |
| calculateDepth computes longest path | Correct depth values |
| calculateDepth handles diamond | Max depth used |
| calculateDepth handles cycle | Graceful handling |

---

#### 2. Resolver Tests

##### analyzeEnvelope.test.js (27 tests)
Tests for the feasibility analysis engine.

| Test Group | Tests | Description |
|------------|-------|-------------|
| basic functionality | 2 | Empty input handling, result structure |
| capacity calculation | 4 | Hour spreading, multiple issues, missing data |
| demand calculation | 3 | Hour spreading, done issues, missing estimates |
| worklog tracking | 2 | Aggregation by date, empty worklogs |
| feasibility score | 4 | No demand, high capacity, low capacity, zero capacity |
| overloaded periods | 3 | Detection, empty array, correct structure |
| timeline structure | 2 | Property validation, cumulative increase |
| completion percentage | 1 | Calculation from worklogs |

##### checkCompliance.test.js (24 tests)
Tests for compliance rule checking.

| Test Group | Tests | Description |
|------------|-------|-------------|
| basic functionality | 2 | Empty issues, result structure |
| missing dates check | 4 | Both dates, start only, due only, done skip |
| missing estimate check | 4 | No estimate, zero estimate, done skip, with estimate |
| done with remaining | 2 | Detection, clean done issues |
| overdue detection | 3 | Past due, future due, no due date |
| epic/child dates | 3 | Child after parent, proper order, no dates |
| dependency dates | 3 | Blocker after blocked, proper order, no dates |
| severity levels | 2 | Correct assignment, grouping |
| byType grouping | 1 | Violations grouped by type |

##### fetchDemand.test.js (17 tests)
Tests for Jira demand issue fetching with API mocking.

| Test Group | Tests | Description |
|------------|-------|-------------|
| fetchDemandIssues | 12 | Empty results, normalization, dates, links, estimates, errors |
| fetchWorklogs | 5 | Empty, fetch success, failure handling, multiple issues, invalid dates |

##### fetchCapacity.test.js (11 tests)
Tests for Jira capacity issue fetching with API mocking.

| Test Group | Tests | Description |
|------------|-------|-------------|
| fetchCapacityIssues | 11 | Empty results, normalization, dates, estimates, errors, multiple issues |

##### buildDependencies.test.js (24 tests)
Tests for dependency graph building and analysis.

| Test Group | Tests | Description |
|------------|-------|-------------|
| basic functionality | 3 | Result structure, empty arrays, summary counts |
| dependency extraction | 4 | Blocking links, link types, missing links, multiple targets |
| date conflict detection | 3 | Conflict detection, no conflict, missing dates |
| root issues | 3 | Identification, done exclusion, status inclusion |
| leaf issues | 2 | Identification, done exclusion |
| circular dependencies | 4 | Simple cycle, long chain, acyclic, description |
| execution order | 2 | Topological order, empty for cycles |
| dependency depth | 2 | Linear chain, parallel chains |
| summary statistics | 3 | Dependency count, circular count, root/leaf count |

---

### Frontend Tests (89 tests)

#### Component Tests

##### App.test.jsx (16 tests)

| Test | Description |
|------|-------------|
| renders loading state | Shows spinner during load |
| renders error state | Displays error message |
| renders retry button in error state | Retry functionality |
| renders summary bar with data | Issues, feasibility displayed |
| renders tab navigation | All tabs present |
| shows Feasibility tab by default | Default view |
| switches to Compliance tab | Tab navigation |
| switches to Dependencies tab | Tab navigation |
| shows badge on Compliance tab | Violation count badge |
| shows badge on Dependencies tab | Circular dep badge |
| renders config panel in edit mode | Edit mode detection |
| applies correct color for low score | Red for <50% |
| applies correct color for medium score | Orange for 50-79% |
| applies correct color for high score | Green for 80%+ |
| applies danger class for violations | Red for violations |
| catches rendering errors | ErrorBoundary test |

##### FeasibilityChart.test.jsx (15 tests)

| Test | Description |
|------|-------------|
| renders without crashing | Basic render |
| renders empty state for no data | Empty message |
| renders chart with data | Chart components present |
| displays feasibility score | Score shown |
| shows correct color for high score | Green indicator |
| shows correct color for medium score | Orange indicator |
| shows correct color for low score | Red indicator |
| renders period selector | Dropdown present |
| changes period on selection | Aggregation works |
| renders overload warnings | Warning banners |
| handles single day data | Edge case |
| renders legend items | All traces labeled |
| formats tooltip correctly | Data formatting |
| handles missing cumulative data | Graceful fallback |
| renders reference line at today | Today marker |

##### CompliancePanel.test.jsx (10 tests)

| Test | Description |
|------|-------------|
| renders empty state | Null data handling |
| renders all clear state | No violations message |
| renders violation count | Total shown |
| renders violations by type | Grouped display |
| shows correct severity colors | Red/orange/blue |
| renders issue links | Clickable links |
| truncates long violation lists | "and X more" |
| groups by severity | Severity sections |
| handles empty violation types | No errors |
| filters by severity | Filter functionality |

##### DependencyView.test.jsx (17 tests)

| Test | Description |
|------|-------------|
| renders empty state | Null data handling |
| renders summary statistics | Counts displayed |
| renders dependency list | Relationships shown |
| renders issue keys as links | Navigation works |
| shows date conflict indicator | Conflict badge |
| renders conflicts only checkbox | Filter control |
| filters to show only conflicts | Filter works |
| hides checkbox when no conflicts | Conditional UI |
| renders root issues section | Root list |
| renders leaf issues section | Leaf list |
| renders circular dependency warning | Cycle alert |
| renders cycle chain with links | Issue links in cycle |
| shows green for zero circular | Color coding |
| shows red for circular deps | Warning color |
| shows empty dependency state | No deps message |
| truncates dependency list | 20 item limit |
| truncates root issues | 5 item limit |

##### ConfigPanel.test.jsx (19 tests)

| Test | Description |
|------|-------------|
| renders form fields | All inputs present |
| displays current config values | Pre-populated |
| updates demand JQL on change | Input handling |
| updates capacity JQL on change | Input handling |
| calls updateConfig on save | Save functionality |
| shows validation errors | Required fields |
| disables save during update | Loading state |
| shows success message | Save confirmation |
| shows error message on failure | Error display |
| resets form on cancel | Cancel functionality |
| validates JQL syntax | Basic validation |
| handles empty config | Default values |
| preserves config on error | No data loss |
| shows help text | Field descriptions |
| handles special characters in JQL | Escaping |
| trims whitespace | Input cleanup |
| disables inputs during save | UI feedback |
| focuses first field on mount | UX enhancement |
| handles rapid saves | Debouncing |

#### Hook Tests

##### useGadgetData.test.js (12 tests)

| Test | Description |
|------|-------------|
| starts with loading state | Initial state |
| loads config and data on mount | Initialization |
| uses default config when loadConfig fails | Fallback |
| uses default config when loadConfig throws | Error handling |
| sets error when getData fails | Error state |
| sets error when getData throws | Exception handling |
| updateConfig saves and updates state | Config persistence |
| updateConfig returns false on failure | Error return |
| refresh fetches data again | Refresh functionality |
| refresh uses default config when needed | Fallback refresh |
| cleans up on unmount | Memory cleanup |
| sets loading during fetch | Loading state |

---

### Test Infrastructure

#### Jira API Mocking

Location: `test/__mocks__/@forge/api.js`

```javascript
// Usage in tests
import { __resetMocks, __setMockResponse } from './__mocks__/@forge/api.js';

beforeEach(() => {
  __resetMocks();
});

test('example', async () => {
  __setMockResponse('POST:/rest/api/3/search/jql', {
    data: { issues: [...] }
  });

  const result = await fetchDemandIssues('project = TEST');
  expect(result).toHaveLength(1);
});
```

**Available Functions:**
- `__resetMocks()` - Clear all mock responses
- `__setMockResponse(endpoint, response)` - Set response for endpoint
- `__setStorageData(key, value)` - Set storage mock data
- `route` - Template literal function mock

#### Test Setup

Location: `test/setup.js`

**Global Helpers:**
- `global.resetMocks()` - Reset mock state
- `global.setMockResponse(endpoint, response)` - Configure mocks
- `global.setStorageData(key, value)` - Set storage
- `global.createMockIssue(overrides)` - Create test issue data
- `global.createMockCapacityIssue(overrides)` - Create capacity issue data

---

## Part 2: Manual Test Cases (33 tests)

See `test/MANUAL_TEST_CASES.md` for detailed procedures.

### Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Installation & Setup | 2 | Marketplace install, dashboard add |
| Configuration | 4 | JQL setup, validation, error handling |
| Feasibility Chart | 5 | Rendering, scoring, tooltips, periods |
| Compliance Panel | 5 | Violations, severity, links, truncation |
| Dependency View | 3 | Display, cycles, filtering |
| Data Refresh | 2 | Manual refresh, config change |
| Error Handling | 2 | Network errors, permissions |
| Performance | 2 | Large datasets, aggregation speed |
| Browser Compatibility | 4 | Chrome, Firefox, Safari, Edge |
| Accessibility | 3 | Keyboard, screen reader, contrast |

### Quick Reference

| ID | Test Name | Priority |
|----|-----------|----------|
| TC-1.1 | Gadget Installation | High |
| TC-1.2 | Add Gadget to Dashboard | High |
| TC-2.1 | Configure Demand JQL | High |
| TC-2.2 | Configure Capacity JQL | High |
| TC-2.3 | Invalid JQL Handling | Medium |
| TC-2.4 | Empty JQL Results | Medium |
| TC-3.1 | Chart Rendering | High |
| TC-3.2 | Feasibility Score Display | High |
| TC-3.3 | Period Selector | Medium |
| TC-3.4 | Chart Tooltip | Low |
| TC-3.5 | Overload Warning Display | Medium |
| TC-4.1 | No Violations Display | Medium |
| TC-4.2 | Violation Type Display | High |
| TC-4.3 | Violation Severity Colors | Medium |
| TC-4.4 | Issue Links in Violations | Medium |
| TC-4.5 | Violation Truncation | Low |
| TC-5.1 | Dependency Display | High |
| TC-5.2 | Circular Dependency Detection | High |
| TC-5.3 | Dependency Conflict Filtering | Medium |
| TC-6.1 | Manual Refresh | Medium |
| TC-6.2 | Configuration Change Refresh | Medium |
| TC-7.1 | Network Error Handling | Medium |
| TC-7.2 | Permission Error Handling | Medium |
| TC-8.1 | Large Dataset Performance | Medium |
| TC-8.2 | Period Aggregation Performance | Low |
| TC-9.1 | Chrome Compatibility | High |
| TC-9.2 | Firefox Compatibility | Medium |
| TC-9.3 | Safari Compatibility | Medium |
| TC-9.4 | Edge Compatibility | Medium |
| TC-10.1 | Keyboard Navigation | Medium |
| TC-10.2 | Screen Reader Compatibility | Low |
| TC-10.3 | Color Contrast | Medium |

---

## Part 3: Coverage Report

### Backend Coverage

```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   96.31 |    82.55 |     100 |   98.49 |
 resolvers             |   95.91 |    80.24 |     100 |   98.48 |
  analyzeEnvelope.js   |   94.52 |    71.25 |     100 |   98.44 |
  buildDependencies.js |   96.96 |    82.50 |     100 |     100 |
  checkCompliance.js   |   97.59 |    90.62 |     100 |     100 |
  fetchCapacity.js     |     100 |    75.00 |     100 |     100 |
  fetchDemand.js       |   94.73 |    80.39 |     100 |   94.33 |
 utils                 |   97.29 |    89.74 |     100 |   98.50 |
  businessDays.js      |   94.44 |    93.33 |     100 |   94.11 |
  dateUtils.js         |     100 |      100 |     100 |     100 |
  graphUtils.js        |   97.53 |    82.50 |     100 |     100 |
-----------------------|---------|----------|---------|---------|
```

### Frontend Coverage

```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   83.73 |    79.00 |   91.83 |   84.15 |
 src                   |   80.00 |    97.22 |   76.92 |   80.00 |
  App.jsx              |   85.71 |    97.22 |   76.92 |   85.71 |
 src/components        |   79.84 |    74.04 |   96.42 |   80.32 |
  CompliancePanel.jsx  |   94.11 |    88.23 |     100 |   92.85 |
  ConfigPanel.jsx      |   95.00 |    83.33 |     100 |   94.73 |
  DependencyView.jsx   |     100 |    96.77 |     100 |     100 |
  FeasibilityChart.jsx |   69.23 |    59.15 |   87.50 |   70.66 |
 src/hooks             |   96.00 |    78.57 |     100 |   96.00 |
  useGadgetData.js     |   96.00 |    78.57 |     100 |   96.00 |
-----------------------|---------|----------|---------|---------|
```

---

## Part 4: Test Maintenance

### Adding New Tests

1. **Backend tests**: Add to `test/` directory with `.test.js` extension
2. **Frontend tests**: Add to `static/frontend/src/` alongside the component
3. **Manual tests**: Update `test/MANUAL_TEST_CASES.md`

### Test Naming Conventions

- Use descriptive test names: `test('handles null estimate', ...)`
- Group related tests with `describe` blocks
- Follow pattern: `[action] [expected result]`

### Mocking Guidelines

1. Reset mocks in `beforeEach`
2. Use specific endpoints: `POST:/rest/api/3/search/jql`
3. Return realistic data structures
4. Test both success and error paths

---

## Appendix: Test Execution Checklist

### Pre-Release Testing

- [ ] All automated tests pass (`npm test`)
- [ ] Coverage thresholds met (>80% lines)
- [ ] Manual smoke tests completed (TC-1.1, TC-2.1, TC-3.1, TC-4.2, TC-5.1)
- [ ] Browser compatibility verified (TC-9.1 through TC-9.4)
- [ ] Performance acceptable (TC-8.1, TC-8.2)

### Regression Testing

- [ ] Core functionality (TC-3.1, TC-4.2, TC-5.1)
- [ ] Configuration (TC-2.1, TC-2.2)
- [ ] Error handling (TC-7.1, TC-7.2)
