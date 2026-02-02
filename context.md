# Beyond Burndown - Project Context

## Overview

**Beyond Burndown** is an Atlassian Forge dashboard gadget for Jira that provides physics-based feasibility analysis. It answers: *"Can we deliver the planned work with available capacity?"*

**Repository**: (private)
**Website**: GitHub Pages (docs/)

## Tech Stack

- **Platform**: Atlassian Forge (serverless, Node.js 22.x)
- **Frontend**: React 18 with @forge/bridge
- **Backend**: Node.js Forge resolvers
- **Storage**: Forge Storage API
- **Testing**: Jest + React Testing Library + Playwright E2E

## Architecture

```
C:\Beyond burndown\
├── src\
│   ├── index.js                 # Main resolver (3 endpoints)
│   ├── resolvers\
│   │   ├── analyzeEnvelope.js   # Feasibility envelope analysis (362 lines)
│   │   ├── checkCompliance.js   # Compliance violation detection (294 lines)
│   │   ├── buildDependencies.js # Dependency graph analysis (209 lines)
│   │   ├── fetchDemand.js       # Demand issue fetching (228 lines)
│   │   └── fetchCapacity.js     # Capacity issue fetching (72 lines)
│   └── utils\
│       ├── businessDays.js      # Business day calculations
│       ├── dateUtils.js         # Date parsing utilities
│       └── graphUtils.js        # Graph algorithms (topological sort, cycle detection)
├── static\frontend\
│   ├── src\
│   │   ├── App.jsx              # Main app shell with tabs
│   │   ├── components\
│   │   │   ├── FeasibilityChart.jsx  # Demand vs capacity chart
│   │   │   ├── CompliancePanel.jsx   # Violation list
│   │   │   ├── DependencyView.jsx    # Dependency graph view
│   │   │   └── ConfigPanel.jsx       # JQL configuration
│   │   └── hooks\
│   │       └── useGadgetData.js      # Data fetching hook
│   └── build\                   # Production build
├── test\                        # Backend unit tests (8 test files)
│   ├── analyzeEnvelope.test.js
│   ├── checkCompliance.test.js
│   ├── buildDependencies.test.js
│   ├── fetchDemand.test.js
│   ├── fetchCapacity.test.js
│   ├── businessDays.test.js
│   ├── dateUtils.test.js
│   ├── graphUtils.test.js
│   └── __mocks__\               # Forge API mocks
├── e2e\                         # E2E tests (Playwright)
│   ├── jira-gadget.spec.js      # Jira gadget E2E tests
│   ├── auth.setup.js            # Auth validation setup
│   └── README.md                # E2E test documentation
├── scripts\                     # Utility scripts
│   ├── jira-login.js            # Atlassian login for tests
│   ├── run-e2e-with-login.js    # E2E runner with live login
│   └── run-jira-tests.js        # Jira test runner
├── docs\                        # Website (GitHub Pages)
│   ├── index.html               # Marketing page
│   └── user-manual.html         # User documentation
├── playwright.jira.config.js    # Playwright config for Jira
└── manifest.yml                 # Forge app definition
```

**Total Backend LOC**: ~1,676 lines

## Key Features

### 1. Feasibility Envelope Analysis
- Spreads remaining estimates across business days
- Compares cumulative demand vs cumulative capacity over time
- Calculates feasibility score (0-100%)
- Identifies overloaded periods with max overload values
- Tracks completion via worklogs (time spent / original estimate)

### 2. Compliance Engine
Detects planning violations with severity levels (error/warning/info):
- **Missing dates**: Issues without start or due dates
- **Missing estimates**: Issues without time estimates
- **Done with remaining**: Completed issues that still have remaining work
- **Overdue**: Issues past their due date
- **Child after parent**: Child stories due after parent Epic
- **Dependency conflicts**: Blocker finishes after blocked issue starts

### 3. Dependency Modeling
- Extracts blocking relationships from Jira issue links
- Builds adjacency list for graph analysis
- Detects circular dependencies
- Calculates topological sort for execution order
- Computes dependency depth for each issue
- Identifies root issues (no blockers) and leaf issues (not blocking anything)

### 4. What-If Scenario Analysis
- Add/remove capacity scenarios (% change)
- Add/remove scope scenarios (% change)
- Adjust deadline scenarios
- Multi-scenario support with combined effects
- Real-time recalculation of feasibility

### 5. Configurable Scoping
- Demand JQL: Defines work that needs to be done
- Capacity JQL: Defines available bandwidth
- Supports custom start date field (customfield_10015)

## Configuration Schema

```javascript
{
  demandJql: string,     // JQL for demand issues (default: 'project = DEV and Summary !~ Capacity')
  capacityJql: string,   // JQL for capacity issues (default: 'project = DEV and Summary ~ Capacity')
  hoursPerDayField: string  // Custom field for hours per day (optional)
}
```

## API Endpoints (Resolvers)

| Endpoint | Purpose |
|----------|---------|
| `getData` | Main analysis - returns envelope, compliance, dependencies, summary |
| `saveConfig` | Save gadget configuration to Forge storage |
| `loadConfig` | Load gadget configuration from Forge storage |

## Data Flow

1. **getData** is called with demand/capacity JQL queries
2. Parallel fetch of demand issues and capacity issues
3. Parallel analysis:
   - `analyzeEnvelope()` - builds daily capacity/demand maps, calculates cumulative values
   - `checkCompliance()` - runs all violation checks
   - `buildDependencies()` - builds graph, detects cycles, calculates depths
4. Returns combined results with summary statistics

## Testing

### Backend Tests
- 8 test files covering all resolvers and utilities
- Jest with Forge API mocks
- Run: `npm test` from root

### Frontend Tests
- Component tests with React Testing Library
- Run: `npm test` from `static/frontend`

### E2E Tests (Playwright)
- Tests against live Jira instance with deployed gadget
- Requires Atlassian email/password authentication (not Google OAuth)
- Run: `node scripts/run-e2e-with-login.js`
- Tests: Dashboard load, gadget detection, tab navigation, What-If panel, Export menu

**Setup Atlassian password:**
1. Go to https://id.atlassian.com/manage-profile/security
2. Create a password for your Atlassian account

### Test Documentation
- `test/MANUAL_TEST_CASES.md` - Manual test scenarios
- `test/TEST_DOCUMENTATION.md` - Test coverage documentation

## Development Workflow

```bash
# Frontend build
cd static/frontend && npm run build

# Run tests
npm test                              # Backend tests
cd static/frontend && npm test        # Frontend tests
node scripts/run-e2e-with-login.js    # E2E tests (opens browser for login)

# Deploy to development
forge deploy

# Install/upgrade on Jira site
forge install --upgrade

# View logs
forge logs -s 5m
```

## Key Algorithms

### Feasibility Score Calculation
```
coverageRatio = min(1, totalCapacity / totalDemand)
overloadPenalty = min(0.3, (overloadedDays / totalDays) * 0.5)
score = (coverageRatio - overloadPenalty) * 100
```

### Daily Demand Distribution
- Skip done issues
- Use remaining estimate (not original)
- Start from today if start date is in past
- Spread evenly across business days
- Default 14-day window if no due date

### Circular Dependency Detection
- DFS-based cycle detection
- Returns all cycles found as arrays of issue keys

## Permissions Required

```yaml
scopes:
  - read:jira-work    # Read issues, sprints, boards
  - read:jira-user    # Read user info (assignees)
  - storage:app       # Store gadget configuration
```

## Related Project

**Sprint Commander** (`C:\sprint\`) - Sprint Capacity Management
- Separate Forge gadget for sprint capacity and auto-leveling
- Has its own GitHub repo and website
- Shares similar Forge architecture patterns

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| No data showing | Check JQL queries in configuration |
| Missing dates/estimates | Ensure issues have proper field values |
| Worklogs not loading | Verify `read:jira-work` permission |
| Config not persisting | Check Forge storage limits |

## Key Files for Common Tasks

| Task | File(s) |
|------|---------|
| Modify feasibility calculation | `src/resolvers/analyzeEnvelope.js` |
| Add new compliance rule | `src/resolvers/checkCompliance.js` |
| Change dependency detection | `src/resolvers/buildDependencies.js` |
| Update UI tabs | `static/frontend/src/App.jsx` |
| Modify chart display | `static/frontend/src/components/FeasibilityChart.jsx` |
| Add new resolver | `src/index.js` |
| Update website | `docs/index.html` |

---

*Last updated: 2026-02-01*
