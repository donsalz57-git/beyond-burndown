# Beyond Burndown - UI Documentation

## Overview

Beyond Burndown is a Jira gadget for feasibility and compliance analysis. It compares demand (work items) against capacity over time, calculates feasibility scores, and tracks completion progress through worklogs.

---

## 1. Main Application Layout

### Application States

| State | Description |
|-------|-------------|
| **Loading** | Spinner displayed while initializing or fetching data |
| **Configuration** | Settings panel shown when no JQL configured or in edit mode |
| **Data Display** | Main feasibility view with chart and summary |
| **Error** | Error message with details and retry option |

### Header Section

#### Summary Statistics

| Element | Description |
|---------|-------------|
| **Feasibility Score** | 0-100% with color coding (green/orange/red) |
| **Total Demand** | Sum of remaining estimates from demand issues (hours) |
| **Total Capacity** | Sum of original estimates from capacity issues (hours) |
| **Time Spent** | Sum of all worklogs from demand issues (hours) |

#### Period Selector

Dropdown to change time aggregation:

| Option | Description |
|--------|-------------|
| **Daily** | No aggregation, each business day shown |
| **Weekly** | Groups by week (Monday start) |
| **Bi-weekly** | Groups by 2-week periods |
| **Monthly** | Groups by calendar month |
| **Quarterly** | Groups by calendar quarter (Q1-Q4) |

---

## 2. Feasibility Chart

### Chart Type

- Line chart with dual Y-axes
- Left axis: Hours (capacity, demand, time spent)
- Right axis: Percentage (0-100% for completion)

### Chart Lines

| Line | Color | Style | Y-Axis | Description |
|------|-------|-------|--------|-------------|
| **Period Capacity** | Green | Solid | Left | Capacity for each period |
| **Period Demand** | Blue | Solid | Left | Demand for each period |
| **Cumulative Capacity** | Green | Dashed | Left | Running total of capacity |
| **Cumulative Demand** | Blue | Dashed | Left | Running total of demand |
| **Cumulative Time Spent** | Orange | Dashed | Left | Running total of logged time |
| **Completion %** | Purple | Solid | Right | Time spent / original estimate |

### Chart Interactions

| Action | Result |
|--------|--------|
| Hover over data point | Tooltip shows period details |
| Change period selector | Chart re-renders with aggregated data |

### Tooltip Content

| Field | Description |
|-------|-------------|
| **Period** | Date or date range label |
| **Business Days** | Number of working days in period |
| **Period Capacity** | Capacity hours for this period |
| **Period Demand** | Demand hours for this period |
| **Cumulative Capacity** | Running total capacity |
| **Cumulative Demand** | Running total demand |
| **Cumulative Original Estimate** | Running total of original estimates |
| **Cumulative Time Spent** | Running total of worklogs |
| **Completion %** | Time spent / original estimate |
| **Overload** | Hours over capacity (if applicable) |

---

## 3. Overload Warnings

### Warning Banner

Displayed when any period has demand exceeding capacity:

| Element | Description |
|---------|-------------|
| **Period Range** | Start and end dates of overloaded period |
| **Days Affected** | Number of business days in overload |
| **Hours Over** | Maximum hours over capacity |

### Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| **Red background** | Period is overloaded |
| **Orange text** | Warning level (approaching capacity) |
| **Green text** | Healthy (under capacity) |

---

## 4. Configuration Panel

### JQL Settings

| Field | Required | Description |
|-------|----------|-------------|
| **Demand JQL** | Yes | Query for work items to analyze |
| **Capacity JQL** | No | Query for capacity-representing issues |

### JQL Field Requirements

#### Demand Issues

| Field | Purpose |
|-------|---------|
| **Start Date** | Beginning of work period |
| **Due Date** | End of work period |
| **Remaining Estimate** | Hours of work remaining |
| **Original Estimate** | Hours originally estimated |
| **Worklogs** | Time logged against issue |

#### Capacity Issues

| Field | Purpose |
|-------|---------|
| **Start Date** | Beginning of availability period |
| **Due Date** | End of availability period |
| **Original Estimate** | Available hours in period |

---

## 5. User Actions - Complete Reference

### Configuring the Gadget

```
Click gear icon on gadget
  → Configuration panel opens
  → Enter Demand JQL (required)
  → Optionally enter Capacity JQL
  → Click "Save"
  → Analysis runs automatically
```

### Changing Time Period

```
Click period dropdown in header
  → Select: Daily, Weekly, Bi-weekly, Monthly, or Quarterly
  → Chart re-renders with aggregated data
  → Feasibility score remains same (based on daily data)
```

### Viewing Overload Details

```
Scroll to Overload Warnings section
  → Red banners show each overloaded period
  → Each banner shows: date range, days affected, hours over
```

### Interpreting the Chart

```
Hover over any data point
  → Tooltip shows all values for that period
  → Compare solid lines (period values) vs dashed (cumulative)
  → Purple line shows completion progress (right axis)
```

---

## 6. Backend Logic

### Date Range Calculation

1. **Collect** all dates from demand issues (start, due)
2. **Collect** all dates from capacity issues (start, due)
3. **Collect** all dates from worklogs
4. **Find** minimum and maximum dates
5. **Add** 5-day buffer to both ends

### Estimate Spreading

Estimates are spread evenly across business days (Monday-Friday):

| Issue Type | Estimate Used | Date Range |
|------------|---------------|------------|
| **Demand (active)** | Remaining Estimate | max(start, today) to due |
| **Demand (done)** | Original Estimate | start to due |
| **Capacity** | Original Estimate | start to due |

### Feasibility Score Calculation

```
Coverage Ratio = min(1, Total Capacity / Total Demand)
Overload Penalty = min(0.3, (Overloaded Days / Total Days) × 0.5)
Feasibility Score = (Coverage Ratio - Overload Penalty) × 100
```

### Completion Percentage Calculation

```
Completion % = (Cumulative Time Spent / Cumulative Original Estimate) × 100
```

### Period Aggregation

| Period | Grouping Logic |
|--------|----------------|
| **Daily** | No grouping, each business day |
| **Weekly** | ISO week number (Monday start) |
| **Bi-weekly** | Every 2 weeks from range start |
| **Monthly** | Calendar month (1st to last day) |
| **Quarterly** | Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec |

---

## 7. Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| **Green feasibility score** | 80-100% - Healthy plan |
| **Orange feasibility score** | 50-79% - At risk |
| **Red feasibility score** | 0-49% - Overloaded |
| **Red overload banner** | Period has demand > capacity |
| **Dashed chart lines** | Cumulative values |
| **Solid chart lines** | Period values |
| **Purple line** | Completion percentage (right axis) |

---

## 8. Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid JQL syntax | Shows error message with details |
| No issues found | Shows "No data available" message |
| Missing dates on issues | Issues excluded from analysis |
| Missing estimates | Issues excluded from relevant calculations |
| Filter permission error | Shows permission error with guidance |
| API failure | Error message with retry option |

---

## 9. Performance Features

- **Efficient JQL**: Only fetches required fields from Jira
- **Client-side Aggregation**: Period grouping done in browser
- **Lazy Calculation**: Scores calculated after data load
- **Worklog Caching**: Worklogs fetched once per session
- **Responsive Chart**: Canvas-based rendering for smooth updates
