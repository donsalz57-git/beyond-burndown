# Test Data Specification for Beyond Burndown

This document describes the test data created for testing the Beyond Burndown Jira gadget.

## Test Scenarios Covered

### 1. Capacity Tracking
- **Sprint Capacity Issues**: Team members with defined capacity (hours/sprint)
  - Alice: 40h capacity
  - Bob: 32h capacity (part-time)
  - Carol: 40h capacity

### 2. Demand Analysis
- **Well-Estimated Issues**: Issues with proper estimates and dates
- **In-Progress Issues**: Issues partially completed
- **Completed Issues**: Issues marked as Done
- **Overloaded Assignee**: Alice has more demand than capacity

### 3. Data Quality (Confidence Testing)
- **Missing Estimates**: Bug without estimate
- **Unassigned Issues**: Issues without assignee

### 4. Compliance Checks
- **Overdue Issues**: Security fix past due date
- **Missing Data**: Issues without required fields

### 5. Dependencies
- **Blocking Relationships**: Issue dependencies for dependency graph testing

## Test Data Structure

### Capacity Issues
| Key | Summary | Assignee | Estimate | Start | Due |
|-----|---------|----------|----------|-------|-----|
| BB-1 | Sprint Capacity - Alice | Alice | 40h | Today | +10 days |
| BB-2 | Sprint Capacity - Bob | Bob | 32h | Today | +10 days |
| BB-3 | Sprint Capacity - Carol | Carol | 40h | Today | +10 days |

### Demand Issues
| Key | Summary | Assignee | Estimate | Remaining | Status |
|-----|---------|----------|----------|-----------|--------|
| BB-4 | Implement user authentication | Alice | 16h | 16h | To Do |
| BB-5 | Add password reset flow | Alice | 8h | 8h | To Do |
| BB-6 | Create user profile page | Bob | 12h | 8h | In Progress |
| BB-7 | Implement dashboard widgets | Bob | 20h | 20h | To Do |
| BB-8 | Add notification system | Carol | 16h | 12h | In Progress |
| BB-9 | Setup CI/CD pipeline | Alice | 8h | 0h | Done |
| BB-10 | Configure test environment | Carol | 4h | 0h | Done |
| BB-11 | Refactor API endpoints | Alice | 24h | 24h | To Do |
| BB-12 | Bug: Login not working | - | 0h | 0h | To Do |
| BB-13 | Research caching options | - | 4h | 4h | To Do |
| BB-14 | Fix critical security issue | Bob | 8h | 4h | In Progress |

## Expected Test Results

### Feasibility Score
With the test data above:
- **Total Capacity**: 112h (40 + 32 + 40)
- **Total Demand**: ~100h (excluding completed)
- **Expected Feasibility**: ~80-90% (capacity slightly exceeds demand)

### Resource Breakdown
| Assignee | Capacity | Demand | Load % | Status |
|----------|----------|--------|--------|--------|
| Alice | 40h | 48h | 120% | Overloaded |
| Bob | 32h | 32h | 100% | On Track |
| Carol | 40h | 12h | 30% | Under-utilized |
| Unassigned | 0h | 4h | - | No Capacity |

### Confidence Score
- **Estimates**: 11/14 issues have estimates (~79%)
- **Dates**: 14/14 issues have dates (100%)
- **Assignees**: 12/14 issues assigned (~86%)
- **Expected Score**: ~88% (High confidence)

### Compliance Violations
- 1 overdue issue (BB-14)
- 1 issue missing estimate (BB-12)
- 2 unassigned issues (BB-12, BB-13)

## Running the Test Data Creator

```bash
# Set environment variables
export JIRA_BASE_URL=https://your-domain.atlassian.net
export JIRA_API_TOKEN=your-api-token
export JIRA_EMAIL=your-email@example.com
export JIRA_PROJECT_KEY=BB

# Run the script
node test/createTestData.js
```

## Manual Test Data Setup

If the script doesn't work, create the test data manually in Jira:

1. Create a project called "Beyond Burndown" (key: BB)
2. Create 3 "Capacity" type issues (or Task) with:
   - Start date: Today
   - Due date: 10 business days from today
   - Original estimate: 40h, 32h, 40h
   - Assigned to different team members

3. Create 11 demand issues (Story/Bug) with varying:
   - Estimates (0h to 24h)
   - Status (To Do, In Progress, Done)
   - Assignees (some unassigned)
   - Due dates (some overdue)

4. Create at least one blocking link between issues

## Verifying Test Data

After creating test data, verify:

1. **Feasibility Tab**: Shows chart with capacity vs demand curves
2. **Team Tab**: Shows per-person breakdown with correct load percentages
3. **Scope Tab**: Shows scope timeline and trend
4. **Report Tab**: Shows full status report with metrics
5. **Confidence Indicator**: Shows appropriate level based on data quality
6. **What-If Panel**: Allows scenario modeling
