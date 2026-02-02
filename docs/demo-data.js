/**
 * Beyond Burndown - Demo Data
 * Realistic sample data showcasing all features
 */

// Generate dates relative to today
function getDate(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Build timeline data (20 business days)
function buildTimeline() {
  const timeline = [];
  let cumulativeCapacity = 0;
  let cumulativeDemand = 0;
  let cumulativeTimeSpent = 0;

  // Daily capacity and demand patterns
  const dailyData = [
    { capacity: 32, demand: 28, timeSpent: 6 },   // Day 1 - past
    { capacity: 32, demand: 30, timeSpent: 7 },   // Day 2 - past
    { capacity: 32, demand: 35, timeSpent: 6.5 }, // Day 3 - past
    { capacity: 32, demand: 32, timeSpent: 7 },   // Day 4 - past
    { capacity: 32, demand: 38, timeSpent: 6 },   // Day 5 - past (overload starts)
    { capacity: 32, demand: 40, timeSpent: 0 },   // Day 6 - today
    { capacity: 32, demand: 42, timeSpent: 0 },   // Day 7
    { capacity: 32, demand: 38, timeSpent: 0 },   // Day 8
    { capacity: 32, demand: 36, timeSpent: 0 },   // Day 9
    { capacity: 32, demand: 34, timeSpent: 0 },   // Day 10 (overload ends)
    { capacity: 32, demand: 30, timeSpent: 0 },   // Day 11
    { capacity: 32, demand: 28, timeSpent: 0 },   // Day 12
    { capacity: 32, demand: 32, timeSpent: 0 },   // Day 13
    { capacity: 24, demand: 35, timeSpent: 0 },   // Day 14 - reduced capacity
    { capacity: 24, demand: 30, timeSpent: 0 },   // Day 15
    { capacity: 32, demand: 28, timeSpent: 0 },   // Day 16
    { capacity: 32, demand: 25, timeSpent: 0 },   // Day 17
    { capacity: 32, demand: 22, timeSpent: 0 },   // Day 18
    { capacity: 32, demand: 20, timeSpent: 0 },   // Day 19
    { capacity: 32, demand: 18, timeSpent: 0 },   // Day 20
  ];

  for (let i = 0; i < dailyData.length; i++) {
    const day = getDate(i - 5); // Start 5 days ago
    const data = dailyData[i];

    cumulativeCapacity += data.capacity;
    cumulativeDemand += data.demand;
    cumulativeTimeSpent += data.timeSpent;

    const overload = cumulativeDemand - cumulativeCapacity;

    timeline.push({
      date: formatDateKey(day),
      displayDate: formatDisplayDate(day),
      capacity: data.capacity,
      demand: data.demand,
      timeSpent: data.timeSpent,
      cumulativeCapacity: Math.round(cumulativeCapacity * 100) / 100,
      cumulativeDemand: Math.round(cumulativeDemand * 100) / 100,
      cumulativeTimeSpent: Math.round(cumulativeTimeSpent * 100) / 100,
      overload: Math.round(Math.max(0, overload) * 100) / 100,
      isOverloaded: overload > 0,
      contributingIssues: i < 10 ? [
        { key: 'DEMO-101', summary: 'User authentication flow', hours: data.demand * 0.3 },
        { key: 'DEMO-102', summary: 'Dashboard redesign', hours: data.demand * 0.25 },
        { key: 'DEMO-103', summary: 'API optimization', hours: data.demand * 0.2 },
        { key: 'DEMO-104', summary: 'Database migration', hours: data.demand * 0.15 },
        { key: 'DEMO-105', summary: 'Testing framework', hours: data.demand * 0.1 }
      ] : []
    });
  }

  return timeline;
}

// Demo envelope data
const demoEnvelope = {
  rangeStart: getDate(-5).toISOString(),
  rangeEnd: getDate(15).toISOString(),
  timeline: buildTimeline(),
  feasibilityScore: 73,
  overloadedPeriods: [
    {
      startDate: formatDateKey(getDate(0)),
      endDate: formatDateKey(getDate(5)),
      maxOverload: 42,
      days: 6
    }
  ],
  totals: {
    totalCapacity: 608,
    totalDemand: 613,
    totalOriginalEstimate: 650,
    totalTimeSpent: 32.5,
    totalDays: 20
  },
  forecast: {
    forecastDate: getDate(17).toISOString(),
    extraDays: 2,
    gap: 5,
    avgDailyCapacity: 30.4,
    status: 'warning',
    message: `Work completes ${formatDisplayDate(getDate(17))} (2 days after deadline)`
  },
  confidence: {
    overallScore: 78,
    level: 'medium',
    breakdown: {
      estimates: { count: 14, total: 18, percent: 78 },
      dates: { count: 15, total: 18, percent: 83 },
      assignees: { count: 13, total: 18, percent: 72 }
    },
    warnings: [
      '4 issues missing estimates',
      '3 issues missing dates',
      '5 issues unassigned'
    ]
  },
  resources: [
    { assignee: 'Alice Chen', capacity: 160, demand: 145, timeSpent: 12, issueCount: 5, loadPercent: 91, status: 'on_track' },
    { assignee: 'Bob Martinez', capacity: 160, demand: 180, timeSpent: 8, issueCount: 6, loadPercent: 113, status: 'overloaded' },
    { assignee: 'Carol Kim', capacity: 160, demand: 120, timeSpent: 10, issueCount: 4, loadPercent: 75, status: 'under_utilized' },
    { assignee: 'David Patel', capacity: 128, demand: 168, timeSpent: 2.5, issueCount: 3, loadPercent: 131, status: 'overloaded' },
    { assignee: 'Unassigned', capacity: 0, demand: 65, timeSpent: 0, issueCount: 5, loadPercent: null, status: 'no_capacity' }
  ]
};

// Demo compliance data
const demoCompliance = {
  violations: [
    // Missing dates
    {
      type: 'missing_dates',
      severity: 'warning',
      issueKey: 'DEMO-108',
      issueSummary: 'Payment gateway integration',
      message: 'Missing both start date and due date',
      details: { hasStartDate: false, hasDueDate: false }
    },
    {
      type: 'missing_dates',
      severity: 'warning',
      issueKey: 'DEMO-112',
      issueSummary: 'Email notification service',
      message: 'Missing due date',
      details: { hasStartDate: true, hasDueDate: false }
    },
    {
      type: 'missing_dates',
      severity: 'info',
      issueKey: 'DEMO-115',
      issueSummary: 'User profile customization',
      message: 'Missing start date',
      details: { hasStartDate: false, hasDueDate: true }
    },
    // Missing estimates
    {
      type: 'missing_estimate',
      severity: 'warning',
      issueKey: 'DEMO-109',
      issueSummary: 'Analytics dashboard widgets',
      message: 'Missing time estimate',
      details: { remainingEstimate: 0, originalEstimate: 0 }
    },
    {
      type: 'missing_estimate',
      severity: 'warning',
      issueKey: 'DEMO-116',
      issueSummary: 'Dark mode implementation',
      message: 'Missing time estimate',
      details: { remainingEstimate: 0, originalEstimate: 0 }
    },
    // Overdue
    {
      type: 'overdue',
      severity: 'error',
      issueKey: 'DEMO-103',
      issueSummary: 'API optimization',
      message: 'Overdue by 3 days',
      details: { dueDate: getDate(-3).toISOString(), daysOverdue: 3 }
    },
    {
      type: 'overdue',
      severity: 'warning',
      issueKey: 'DEMO-107',
      issueSummary: 'Search functionality',
      message: 'Overdue by 1 day',
      details: { dueDate: getDate(-1).toISOString(), daysOverdue: 1 }
    },
    // Dependency conflicts
    {
      type: 'dependency_conflict',
      severity: 'error',
      issueKey: 'DEMO-104',
      issueSummary: 'Database migration',
      message: 'Blocked by DEMO-106 which finishes 2 days after this starts',
      details: {
        blockerKey: 'DEMO-106',
        blockerDueDate: getDate(4).toISOString(),
        issueStartDate: getDate(2).toISOString(),
        daysDifference: 2
      }
    },
    // Child after parent
    {
      type: 'child_after_parent',
      severity: 'error',
      issueKey: 'DEMO-111',
      issueSummary: 'Mobile app feature',
      message: 'Due 5 days after parent DEMO-100',
      details: {
        parentKey: 'DEMO-100',
        parentDueDate: getDate(10).toISOString(),
        childDueDate: getDate(15).toISOString(),
        daysDifference: 5
      }
    }
  ],
  byType: {
    missing_dates: [
      { type: 'missing_dates', severity: 'warning', issueKey: 'DEMO-108', issueSummary: 'Payment gateway integration', message: 'Missing both start date and due date' },
      { type: 'missing_dates', severity: 'warning', issueKey: 'DEMO-112', issueSummary: 'Email notification service', message: 'Missing due date' },
      { type: 'missing_dates', severity: 'info', issueKey: 'DEMO-115', issueSummary: 'User profile customization', message: 'Missing start date' }
    ],
    missing_estimate: [
      { type: 'missing_estimate', severity: 'warning', issueKey: 'DEMO-109', issueSummary: 'Analytics dashboard widgets', message: 'Missing time estimate' },
      { type: 'missing_estimate', severity: 'warning', issueKey: 'DEMO-116', issueSummary: 'Dark mode implementation', message: 'Missing time estimate' }
    ],
    overdue: [
      { type: 'overdue', severity: 'error', issueKey: 'DEMO-103', issueSummary: 'API optimization', message: 'Overdue by 3 days' },
      { type: 'overdue', severity: 'warning', issueKey: 'DEMO-107', issueSummary: 'Search functionality', message: 'Overdue by 1 day' }
    ],
    dependency_conflict: [
      { type: 'dependency_conflict', severity: 'error', issueKey: 'DEMO-104', issueSummary: 'Database migration', message: 'Blocked by DEMO-106 which finishes 2 days after this starts' }
    ],
    child_after_parent: [
      { type: 'child_after_parent', severity: 'error', issueKey: 'DEMO-111', issueSummary: 'Mobile app feature', message: 'Due 5 days after parent DEMO-100' }
    ]
  },
  summary: {
    total: 9,
    byType: {
      missing_dates: 3,
      missing_estimate: 2,
      overdue: 2,
      dependency_conflict: 1,
      child_after_parent: 1
    },
    bySeverity: {
      error: 4,
      warning: 4,
      info: 1
    }
  }
};

// Demo dependencies data
const demoDependencies = {
  issues: [
    { key: 'DEMO-100', summary: 'Epic: Q1 Release', depth: 0, blockers: [], blocks: ['DEMO-101', 'DEMO-102', 'DEMO-103'] },
    { key: 'DEMO-101', summary: 'User authentication flow', depth: 1, blockers: ['DEMO-100'], blocks: ['DEMO-104', 'DEMO-105'] },
    { key: 'DEMO-102', summary: 'Dashboard redesign', depth: 1, blockers: ['DEMO-100'], blocks: ['DEMO-106'] },
    { key: 'DEMO-103', summary: 'API optimization', depth: 1, blockers: ['DEMO-100'], blocks: ['DEMO-107'] },
    { key: 'DEMO-104', summary: 'Database migration', depth: 2, blockers: ['DEMO-101'], blocks: ['DEMO-108'] },
    { key: 'DEMO-105', summary: 'Testing framework', depth: 2, blockers: ['DEMO-101'], blocks: [] },
    { key: 'DEMO-106', summary: 'Chart components', depth: 2, blockers: ['DEMO-102'], blocks: ['DEMO-109'] },
    { key: 'DEMO-107', summary: 'Search functionality', depth: 2, blockers: ['DEMO-103'], blocks: [] },
    { key: 'DEMO-108', summary: 'Payment gateway', depth: 3, blockers: ['DEMO-104'], blocks: ['DEMO-110'] },
    { key: 'DEMO-109', summary: 'Analytics widgets', depth: 3, blockers: ['DEMO-106'], blocks: [] },
    { key: 'DEMO-110', summary: 'Checkout flow', depth: 4, blockers: ['DEMO-108'], blocks: ['DEMO-111'] },
    { key: 'DEMO-111', summary: 'Mobile app feature', depth: 5, blockers: ['DEMO-110'], blocks: [] },
    // Circular dependency chain
    { key: 'DEMO-120', summary: 'Feature A', depth: 1, blockers: ['DEMO-122'], blocks: ['DEMO-121'] },
    { key: 'DEMO-121', summary: 'Feature B', depth: 2, blockers: ['DEMO-120'], blocks: ['DEMO-122'] },
    { key: 'DEMO-122', summary: 'Feature C', depth: 3, blockers: ['DEMO-121'], blocks: ['DEMO-120'] }
  ],
  circularDependencies: [
    {
      cycle: ['DEMO-120', 'DEMO-121', 'DEMO-122', 'DEMO-120'],
      description: 'DEMO-120 -> DEMO-121 -> DEMO-122 -> DEMO-120'
    }
  ],
  rootIssues: ['DEMO-100'],
  leafIssues: ['DEMO-105', 'DEMO-107', 'DEMO-109', 'DEMO-111'],
  maxDepth: 5,
  stats: {
    totalIssues: 15,
    issuesWithBlockers: 12,
    issuesBlocking: 10,
    avgDependencyDepth: 2.3
  }
};

// Demo scope data
const demoScope = {
  scopeTimeline: [
    { date: formatDateKey(getDate(-14)), added: 120, removed: 0, total: 120 },
    { date: formatDateKey(getDate(-10)), added: 45, removed: 0, total: 165 },
    { date: formatDateKey(getDate(-7)), added: 0, removed: 20, total: 145 },
    { date: formatDateKey(getDate(-5)), added: 30, removed: 0, total: 175 },
    { date: formatDateKey(getDate(-3)), added: 25, removed: 15, total: 185 },
    { date: formatDateKey(getDate(-1)), added: 40, removed: 0, total: 225 },
    { date: formatDateKey(getDate(0)), added: 0, removed: 10, total: 215 }
  ],
  totals: {
    originalScope: 120,
    currentScope: 215,
    totalAdded: 140,
    totalRemoved: 45,
    netChange: 95,
    percentChange: 79
  },
  trend: 'increasing',
  alerts: [
    {
      type: 'scope_creep',
      severity: 'warning',
      message: 'Scope increased 79% since project start',
      details: { originalHours: 120, currentHours: 215 }
    },
    {
      type: 'recent_additions',
      severity: 'info',
      message: '65 hours added in the last 5 days',
      details: { hoursAdded: 65, daysPeriod: 5 }
    }
  ]
};

// Demo status report
const demoStatusReport = {
  generatedAt: new Date().toISOString(),
  headline: {
    feasibility: {
      score: 73,
      status: 'yellow',
      trend: null
    },
    forecast: {
      date: getDate(17).toISOString(),
      extraDays: 2,
      status: 'warning',
      message: `Work completes ${formatDisplayDate(getDate(17))} (2 days after deadline)`
    },
    capacityUtilization: {
      percent: 101,
      status: 'red'
    },
    completion: {
      percent: 5,
      status: 'info'
    }
  },
  schedule: {
    deadline: getDate(15).toISOString(),
    forecast: getDate(17).toISOString(),
    buffer: -2,
    bufferLabel: '2 days late'
  },
  capacity: {
    available: 608,
    demand: 613,
    timeSpent: 32.5,
    gap: 5,
    utilizationPercent: 101
  },
  progress: {
    closedCount: 3,
    closedHours: 24,
    remainingCount: 15,
    remainingHours: 589,
    completionPercent: 5
  },
  risks: {
    overloadedPeriods: {
      count: 1,
      details: [
        { dates: `${formatDateKey(getDate(0))} - ${formatDateKey(getDate(5))}`, days: 6, maxOverload: 42 }
      ]
    },
    complianceViolations: {
      count: 9,
      bySeverity: { error: 4, warning: 4, info: 1 }
    },
    circularDependencies: {
      count: 1,
      details: ['DEMO-120 -> DEMO-121 -> DEMO-122 -> DEMO-120']
    },
    overdueIssues: {
      count: 2,
      hours: 48
    }
  },
  decisions: [
    {
      priority: 'high',
      title: 'Capacity Gap',
      description: 'Demand exceeds capacity by 5 hours. Team is slightly overloaded.',
      options: ['Add overtime', 'Reduce scope', 'Extend deadline by 2 days']
    },
    {
      priority: 'high',
      title: 'Circular Dependencies Detected',
      description: '1 circular dependency chain blocking work.',
      action: 'Break dependency cycles between DEMO-120, DEMO-121, DEMO-122'
    },
    {
      priority: 'medium',
      title: 'Overdue Issues',
      description: '2 issues are overdue (48h of work).',
      action: 'Review blockers and reassign if needed'
    },
    {
      priority: 'medium',
      title: 'Scope Creep Alert',
      description: 'Scope has increased 79% since project start.',
      action: 'Review scope additions and prioritize'
    }
  ],
  confidence: demoEnvelope.confidence
};

// Demo config
const demoConfig = {
  demandJql: 'project = DEMO AND type in (Story, Task, Bug)',
  capacityMode: 'manual',
  capacityType: 'individual',
  capacityPeriod: 'week',
  teamHours: 160,
  teamMembers: [
    { name: 'Alice Chen', hoursPerPeriod: 40, startDate: null, endDate: null },
    { name: 'Bob Martinez', hoursPerPeriod: 40, startDate: null, endDate: null },
    { name: 'Carol Kim', hoursPerPeriod: 40, startDate: null, endDate: null },
    { name: 'David Patel', hoursPerPeriod: 32, startDate: null, endDate: null }
  ]
};

// Combined demo data export
const DEMO_DATA = {
  envelope: demoEnvelope,
  compliance: demoCompliance,
  dependencies: demoDependencies,
  scope: demoScope,
  statusReport: demoStatusReport,
  summary: {
    totalDemandIssues: 18,
    totalCapacityIssues: 4,
    totalViolations: 9,
    circularDependencies: 1,
    feasibilityScore: 73
  }
};

const DEMO_CONFIG = demoConfig;

// Export for use in demo page
if (typeof window !== 'undefined') {
  window.DEMO_DATA = DEMO_DATA;
  window.DEMO_CONFIG = DEMO_CONFIG;
}

if (typeof module !== 'undefined') {
  module.exports = { DEMO_DATA, DEMO_CONFIG };
}
