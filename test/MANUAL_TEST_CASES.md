# Beyond Burndown - Manual Test Cases

## Overview

This document contains manual test cases for Beyond Burndown that cannot be fully automated or require human verification. These tests cover UI interactions, visual verification, and integration with Jira.

---

## 1. Installation & Setup Tests

### TC-1.1: Gadget Installation
**Objective:** Verify the gadget can be installed from Atlassian Marketplace

**Prerequisites:**
- Jira Cloud instance with admin access
- Atlassian Marketplace account

**Steps:**
1. Navigate to Atlassian Marketplace
2. Search for "Beyond Burndown" or "Feasibility Analyzer"
3. Click "Get it now"
4. Select your Jira Cloud site
5. Confirm installation

**Expected Result:**
- Installation completes without errors
- Gadget appears in the gadget library

---

### TC-1.2: Add Gadget to Dashboard
**Objective:** Verify the gadget can be added to a Jira dashboard

**Steps:**
1. Navigate to a Jira dashboard
2. Click "Add gadget"
3. Search for "Feasibility" or "Beyond Burndown"
4. Click "Add gadget"

**Expected Result:**
- Gadget appears on dashboard
- Configuration panel is shown initially
- No JavaScript errors in console

---

## 2. Configuration Tests

### TC-2.1: Configure Demand JQL
**Objective:** Verify demand JQL configuration works correctly

**Prerequisites:**
- Gadget added to dashboard
- Project with issues that have dates and estimates

**Steps:**
1. Click the gear/edit icon on the gadget
2. Enter a valid JQL query: `project = PROJ AND sprint in openSprints()`
3. Click "Save Configuration"

**Expected Result:**
- Configuration saves successfully
- Chart displays with data from matching issues
- No error messages shown

---

### TC-2.2: Configure Capacity JQL
**Objective:** Verify capacity JQL configuration works correctly

**Steps:**
1. Open gadget configuration
2. Enter Demand JQL: `project = PROJ AND type = Story`
3. Enter Capacity JQL: `project = PROJ AND summary ~ "Capacity"`
4. Click "Save Configuration"

**Expected Result:**
- Both JQL queries are saved
- Chart shows both capacity and demand lines
- Feasibility score is calculated

---

### TC-2.3: Invalid JQL Handling
**Objective:** Verify proper error handling for invalid JQL

**Steps:**
1. Open gadget configuration
2. Enter invalid JQL: `project = NONEXISTENT123`
3. Click "Save Configuration"

**Expected Result:**
- Appropriate error message displayed
- User can correct the JQL and retry
- Application doesn't crash

---

### TC-2.4: Empty JQL Results
**Objective:** Verify handling when JQL returns no issues

**Steps:**
1. Open gadget configuration
2. Enter JQL that returns no results: `project = PROJ AND created > 2099-01-01`
3. Click "Save Configuration"

**Expected Result:**
- "No data available" message displayed
- Application handles gracefully

---

## 3. Feasibility Chart Tests

### TC-3.1: Chart Rendering
**Objective:** Verify chart renders correctly with data

**Prerequisites:**
- Configured gadget with valid JQL
- Issues with dates and estimates in scope

**Steps:**
1. Load the dashboard with configured gadget
2. Wait for data to load

**Expected Result:**
- Chart displays with all lines:
  - Green solid line (Period Capacity)
  - Blue solid line (Period Demand)
  - Green dashed line (Cumulative Capacity)
  - Blue dashed line (Cumulative Demand)
  - Orange dashed line (Cumulative Time Spent)
  - Purple solid line (Completion %)
- Legend displays correctly
- Axes have appropriate labels

---

### TC-3.2: Feasibility Score Display
**Objective:** Verify feasibility score displays with correct color coding

**Test Cases:**

| Score Range | Expected Color |
|-------------|----------------|
| 80-100% | Green (#00875A) |
| 50-79% | Orange (#FF8B00) |
| 0-49% | Red (#DE350B) |

**Steps:**
1. Create test data that produces each score range
2. Verify the score text color matches expected

---

### TC-3.3: Period Selector
**Objective:** Verify period aggregation works correctly

**Steps:**
1. Load chart with daily data
2. Select "Weekly" from period dropdown
3. Verify chart updates to show weekly aggregation
4. Select "Monthly"
5. Verify chart updates to show monthly aggregation
6. Select "Quarterly"
7. Verify chart updates to show quarterly aggregation

**Expected Result:**
- Chart re-renders with aggregated data for each period
- X-axis labels update appropriately
- Legend labels update (e.g., "Daily Capacity" → "Weekly Capacity")
- Cumulative values are recalculated correctly

---

### TC-3.4: Chart Tooltip
**Objective:** Verify tooltip displays correct information

**Steps:**
1. Load chart with data
2. Hover over a data point on the chart

**Expected Result:**
- Tooltip appears with:
  - Period date/label
  - Business days in period (for aggregated views)
  - Period capacity and demand values
  - Cumulative capacity and demand
  - Cumulative original estimate and time spent
  - Completion percentage
  - Overload amount (if applicable)

---

### TC-3.5: Overload Warning Display
**Objective:** Verify overload warnings display correctly

**Prerequisites:**
- Data where demand exceeds capacity for some periods

**Steps:**
1. Load chart with overloaded periods
2. Verify warning banners appear

**Expected Result:**
- Red warning banner for each overloaded period
- Shows date range, days affected, max hours over capacity
- Warning is visually distinct

---

## 4. Compliance Panel Tests

### TC-4.1: No Violations Display
**Objective:** Verify "All Clear" state when no violations

**Prerequisites:**
- Issues with all required fields filled correctly

**Steps:**
1. Navigate to Compliance tab
2. Verify display

**Expected Result:**
- "All Clear!" message displayed
- "No compliance violations detected" text shown

---

### TC-4.2: Violation Type Display
**Objective:** Verify all violation types display correctly

**Violation Types to Test:**

| Type | Description | How to Create |
|------|-------------|---------------|
| Missing Dates | Issue without start/due date | Create issue, don't set dates |
| Missing Estimates | Issue without estimate | Create issue, don't set estimate |
| Done with Remaining | Completed issue with remaining work | Complete issue but leave remaining estimate |
| Overdue | Issue past due date | Set due date in past |
| Child After Parent | Child due after epic | Create subtask due after parent |
| Dependency Conflict | Blocker ends after blocked starts | Create blocking relationship with date conflict |

**Steps:**
1. Create test issues for each violation type
2. Navigate to Compliance tab
3. Verify each type appears with correct label and count

---

### TC-4.3: Violation Severity Colors
**Objective:** Verify severity indicators use correct colors

| Severity | Expected Color |
|----------|----------------|
| Error | Red (#DE350B) |
| Warning | Orange (#FF8B00) |
| Info | Blue (#0052CC) |

---

### TC-4.4: Issue Links in Violations
**Objective:** Verify issue links navigate correctly

**Steps:**
1. View a violation in the Compliance panel
2. Click on the issue key link

**Expected Result:**
- New tab opens with the Jira issue
- Correct issue is displayed

---

### TC-4.5: Violation Truncation
**Objective:** Verify more than 10 violations shows "and X more"

**Steps:**
1. Create 15+ violations of the same type
2. Navigate to Compliance tab

**Expected Result:**
- First 10 violations displayed
- "... and X more" message shown at bottom

---

## 5. Dependency View Tests

### TC-5.1: Dependency Display
**Objective:** Verify dependency relationships display correctly

**Prerequisites:**
- Issues with blocking relationships

**Steps:**
1. Navigate to Dependencies tab
2. Verify dependency list shows correct relationships

**Expected Result:**
- Dependencies listed as "Issue A → blocks → Issue B"
- Count of total dependencies shown
- Root issues (no blockers) identified
- Leaf issues (not blocking) identified

---

### TC-5.2: Circular Dependency Detection
**Objective:** Verify circular dependencies are detected and displayed

**Steps:**
1. Create circular dependency: A blocks B, B blocks C, C blocks A
2. Navigate to Dependencies tab

**Expected Result:**
- Circular dependency warning displayed
- Cycle chain shown (e.g., A → B → C → A)
- Count of circular dependencies shown

---

### TC-5.3: Dependency Conflict Filtering
**Objective:** Verify "Show conflicts only" toggle works

**Steps:**
1. Have mix of normal dependencies and conflicts
2. Toggle "Show conflicts only" on
3. Verify only conflicts display
4. Toggle off
5. Verify all dependencies display

---

## 6. Data Refresh Tests

### TC-6.1: Manual Refresh
**Objective:** Verify data can be refreshed

**Steps:**
1. Load gadget with data
2. Make changes to issues in Jira (change estimates, dates)
3. Refresh the dashboard or gadget

**Expected Result:**
- Updated data is displayed
- Changes reflected in chart and calculations

---

### TC-6.2: Configuration Change Refresh
**Objective:** Verify data refreshes after configuration change

**Steps:**
1. Load gadget with data
2. Change JQL configuration
3. Save configuration

**Expected Result:**
- Data automatically refreshes with new JQL
- Chart updates to reflect new scope

---

## 7. Error Handling Tests

### TC-7.1: Network Error Handling
**Objective:** Verify graceful handling of network errors

**Steps:**
1. Simulate network disconnection (browser dev tools)
2. Attempt to load gadget or refresh data

**Expected Result:**
- Appropriate error message displayed
- Option to retry
- No JavaScript errors/crashes

---

### TC-7.2: Permission Error Handling
**Objective:** Verify handling when user lacks permissions

**Steps:**
1. Configure JQL for project user can't access
2. Save configuration

**Expected Result:**
- Permission error message displayed
- Guidance on how to resolve

---

## 8. Performance Tests

### TC-8.1: Large Dataset Performance
**Objective:** Verify acceptable performance with many issues

**Steps:**
1. Configure JQL that returns 500+ issues
2. Measure load time
3. Verify UI remains responsive

**Expected Result:**
- Data loads within acceptable time (< 30 seconds)
- UI remains responsive during load
- No browser freezing

---

### TC-8.2: Period Aggregation Performance
**Objective:** Verify period switching is fast

**Steps:**
1. Load chart with large dataset
2. Switch between period options
3. Measure response time

**Expected Result:**
- Period switching completes in < 1 second
- No UI freezing during aggregation

---

## 9. Browser Compatibility Tests

### TC-9.1: Chrome Compatibility
**Objective:** Verify functionality in Chrome

**Steps:**
1. Open gadget in Chrome (latest version)
2. Run through core functionality tests

**Expected Result:**
- All features work correctly
- No visual issues

---

### TC-9.2: Firefox Compatibility
**Objective:** Verify functionality in Firefox

**Steps:**
1. Open gadget in Firefox (latest version)
2. Run through core functionality tests

**Expected Result:**
- All features work correctly
- No visual issues

---

### TC-9.3: Safari Compatibility
**Objective:** Verify functionality in Safari

**Steps:**
1. Open gadget in Safari (latest version)
2. Run through core functionality tests

**Expected Result:**
- All features work correctly
- No visual issues

---

### TC-9.4: Edge Compatibility
**Objective:** Verify functionality in Edge

**Steps:**
1. Open gadget in Edge (latest version)
2. Run through core functionality tests

**Expected Result:**
- All features work correctly
- No visual issues

---

## 10. Accessibility Tests

### TC-10.1: Keyboard Navigation
**Objective:** Verify gadget is keyboard accessible

**Steps:**
1. Use Tab key to navigate through gadget
2. Use Enter/Space to activate controls
3. Verify all interactive elements are reachable

**Expected Result:**
- All controls accessible via keyboard
- Focus indicators visible
- Logical tab order

---

### TC-10.2: Screen Reader Compatibility
**Objective:** Verify screen reader can read content

**Steps:**
1. Enable screen reader (VoiceOver, NVDA, etc.)
2. Navigate through gadget
3. Verify content is announced

**Expected Result:**
- Feasibility score announced
- Chart data accessible (via legend/tooltip)
- Violation lists readable

---

### TC-10.3: Color Contrast
**Objective:** Verify sufficient color contrast

**Steps:**
1. Use accessibility checker tool
2. Verify text meets WCAG 2.1 contrast requirements

**Expected Result:**
- All text has at least 4.5:1 contrast ratio
- Interactive elements have visible focus states

---

## Test Execution Checklist

| Test ID | Test Name | Pass/Fail | Date | Tester | Notes |
|---------|-----------|-----------|------|--------|-------|
| TC-1.1 | Gadget Installation | | | | |
| TC-1.2 | Add Gadget to Dashboard | | | | |
| TC-2.1 | Configure Demand JQL | | | | |
| TC-2.2 | Configure Capacity JQL | | | | |
| TC-2.3 | Invalid JQL Handling | | | | |
| TC-2.4 | Empty JQL Results | | | | |
| TC-3.1 | Chart Rendering | | | | |
| TC-3.2 | Feasibility Score Display | | | | |
| TC-3.3 | Period Selector | | | | |
| TC-3.4 | Chart Tooltip | | | | |
| TC-3.5 | Overload Warning Display | | | | |
| TC-4.1 | No Violations Display | | | | |
| TC-4.2 | Violation Type Display | | | | |
| TC-4.3 | Violation Severity Colors | | | | |
| TC-4.4 | Issue Links in Violations | | | | |
| TC-4.5 | Violation Truncation | | | | |
| TC-5.1 | Dependency Display | | | | |
| TC-5.2 | Circular Dependency Detection | | | | |
| TC-5.3 | Dependency Conflict Filtering | | | | |
| TC-6.1 | Manual Refresh | | | | |
| TC-6.2 | Configuration Change Refresh | | | | |
| TC-7.1 | Network Error Handling | | | | |
| TC-7.2 | Permission Error Handling | | | | |
| TC-8.1 | Large Dataset Performance | | | | |
| TC-8.2 | Period Aggregation Performance | | | | |
| TC-9.1 | Chrome Compatibility | | | | |
| TC-9.2 | Firefox Compatibility | | | | |
| TC-9.3 | Safari Compatibility | | | | |
| TC-9.4 | Edge Compatibility | | | | |
| TC-10.1 | Keyboard Navigation | | | | |
| TC-10.2 | Screen Reader Compatibility | | | | |
| TC-10.3 | Color Contrast | | | | |
