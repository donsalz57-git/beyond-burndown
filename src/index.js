import Resolver from '@forge/resolver';
import { fetchDemandIssues, fetchWorklogs } from './resolvers/fetchDemand';
import { fetchCapacityIssues, buildManualCapacityIssues, buildTeamCapacityIssue } from './resolvers/fetchCapacity';
import { analyzeEnvelope } from './resolvers/analyzeEnvelope';
import { checkCompliance } from './resolvers/checkCompliance';
import { buildDependencies } from './resolvers/buildDependencies';
import { analyzeScopeHistory, calculateScopeChangeTrend } from './resolvers/analyzeScopeHistory';
import { generateStatusReport } from './resolvers/generateStatusReport';

const resolver = new Resolver();

/**
 * Calculate date range from demand issues for manual capacity
 * Uses the earliest start date and latest due date from demand issues
 * Falls back to today + 30 days if no dates found
 */
function calculateDateRangeFromDemand(demandIssues) {
  let minDate = null;
  let maxDate = null;

  for (const issue of demandIssues) {
    if (issue.startDate) {
      const start = new Date(issue.startDate);
      if (!minDate || start < minDate) minDate = start;
    }
    if (issue.dueDate) {
      const due = new Date(issue.dueDate);
      if (!maxDate || due > maxDate) maxDate = due;
    }
  }

  // Default to today + 30 days if no dates found
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!minDate) minDate = today;
  if (!maxDate) {
    maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
  }

  return { start: minDate, end: maxDate };
}

// Main data fetching endpoint - returns all analysis data
resolver.define('getData', async ({ payload, context }) => {
  const {
    demandJql = 'project = DEV and Summary !~ Capacity',
    capacityJql = 'project = DEV and Summary ~ Capacity',
    capacityMode = 'jira',  // 'manual' or 'jira'
    capacityType = 'team',  // 'team' or 'individual'
    capacityPeriod = 'week', // 'week' or 'month'
    teamHours = 160,  // Total team hours (when capacityType is 'team')
    teamMembers = []  // Array of {name, hoursPerPeriod, startDate?, endDate?}
  } = payload || {};

  try {
    // Fetch demand issues first (always needed)
    const demandIssues = await fetchDemandIssues(demandJql);

    // Determine capacity issues based on mode
    let capacityIssues;
    if (capacityMode === 'manual') {
      // Calculate date range from demand issues for manual capacity
      const dateRange = calculateDateRangeFromDemand(demandIssues);

      if (capacityType === 'team' && teamHours > 0) {
        // Team total capacity - create a single capacity entry
        capacityIssues = buildTeamCapacityIssue(
          teamHours,
          capacityPeriod,
          dateRange.start,
          dateRange.end
        );
        console.log('Using team total capacity:', teamHours, 'hours per', capacityPeriod);
      } else if (capacityType === 'individual' && teamMembers.length > 0) {
        // Per-user capacity
        capacityIssues = buildManualCapacityIssues(
          teamMembers,
          capacityPeriod,
          dateRange.start,
          dateRange.end
        );
        console.log('Using individual capacity:', capacityIssues.length, 'entries');
      } else {
        capacityIssues = [];
        console.log('No manual capacity configured');
      }
    } else {
      // Fetch capacity from Jira
      capacityIssues = await fetchCapacityIssues(capacityJql);
      console.log('Using Jira capacity:', capacityIssues.length, 'issues');
    }

    // Fetch worklogs for demand issues (non-blocking - continue if fails)
    let worklogs = [];
    try {
      worklogs = await fetchWorklogs(demandIssues);
    } catch (worklogError) {
      console.warn('Failed to fetch worklogs, continuing without:', worklogError);
    }

    // Run all analyses in parallel
    // Note: analyzeEnvelope now receives capacityIssues for per-person capacity tracking
    const [envelope, compliance, dependencies] = await Promise.all([
      analyzeEnvelope(demandIssues, capacityIssues, worklogs),
      checkCompliance(demandIssues),
      buildDependencies(demandIssues)
    ]);

    // Run scope analysis (depends on envelope timeline)
    const scopeHistory = analyzeScopeHistory(demandIssues, envelope.timeline);
    const scopeTrend = calculateScopeChangeTrend(demandIssues);

    // Generate status report
    const statusReport = generateStatusReport(envelope, compliance, dependencies, demandIssues);

    return {
      success: true,
      data: {
        envelope,
        compliance,
        dependencies,
        scope: {
          ...scopeHistory,
          trend: scopeTrend.trend,
          alerts: scopeTrend.alerts
        },
        statusReport,
        summary: {
          totalDemandIssues: demandIssues.length,
          totalCapacityIssues: capacityIssues.length,
          totalViolations: compliance.violations.length,
          circularDependencies: dependencies.circularDependencies.length,
          feasibilityScore: envelope.feasibilityScore
        }
      }
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Helper to get consistent storage key for gadget config
function getConfigKey(context) {
  // Try gadget ID first, then dashboard ID, then fall back to 'default'
  const gadgetId = context.extension?.gadget?.id;
  const dashboardId = context.extension?.gadget?.dashboardId;

  // Use gadget ID if available, otherwise dashboard ID, otherwise default
  const key = gadgetId || dashboardId || 'default';
  console.log('getConfigKey - gadgetId:', gadgetId, 'dashboardId:', dashboardId, 'using key:', key);
  return `config-${key}`;
}

// Save gadget configuration
resolver.define('saveConfig', async ({ payload, context }) => {
  const { storage } = await import('@forge/api');
  const configKey = getConfigKey(context);

  try {
    await storage.set(configKey, payload);
    console.log('saveConfig - saved successfully with key:', configKey);
    return { success: true };
  } catch (error) {
    console.error('Error saving config:', error);
    return { success: false, error: error.message };
  }
});

// Load gadget configuration
resolver.define('loadConfig', async ({ context }) => {
  const { storage } = await import('@forge/api');
  const configKey = getConfigKey(context);

  try {
    let config = await storage.get(configKey);

    // If no config found and we're using a specific key, try the 'default' key as fallback
    if (!config && configKey !== 'config-default') {
      console.log('loadConfig - trying fallback to default key');
      config = await storage.get('config-default');
    }

    console.log('loadConfig - loaded config:', config ? 'found' : 'not found', 'with key:', configKey);
    return {
      success: true,
      config: config || {
        demandJql: 'project = DEV and Summary !~ Capacity',
        capacityJql: 'project = DEV and Summary ~ Capacity',
        capacityMode: 'manual',  // Default to manual for new users
        capacityType: 'team',
        capacityPeriod: 'week',
        teamHours: 160,
        teamMembers: []
      }
    };
  } catch (error) {
    console.error('Error loading config:', error);
    return { success: false, error: error.message };
  }
});

// Fetch users for capacity dropdown
resolver.define('getUsers', async ({ payload }) => {
  const { storage } = await import('@forge/api');
  const api = (await import('@forge/api')).default;
  const { route } = await import('@forge/api');

  try {
    // Search for assignable users (project members)
    const query = payload?.query || '';
    const response = await api.asApp().requestJira(
      route`/rest/api/3/user/search?query=${query}&maxResults=50`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to fetch users:', error);
      return { success: false, users: [] };
    }

    const users = await response.json();
    return {
      success: true,
      users: users.map(u => ({
        accountId: u.accountId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrls?.['24x24'] || null
      }))
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, users: [] };
  }
});

export const handler = resolver.getDefinitions();
