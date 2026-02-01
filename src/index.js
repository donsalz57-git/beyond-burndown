import Resolver from '@forge/resolver';
import { fetchDemandIssues, fetchWorklogs } from './resolvers/fetchDemand';
import { fetchCapacityIssues } from './resolvers/fetchCapacity';
import { analyzeEnvelope } from './resolvers/analyzeEnvelope';
import { checkCompliance } from './resolvers/checkCompliance';
import { buildDependencies } from './resolvers/buildDependencies';
import { analyzeScopeHistory, calculateScopeChangeTrend } from './resolvers/analyzeScopeHistory';
import { generateStatusReport } from './resolvers/generateStatusReport';

const resolver = new Resolver();

// Main data fetching endpoint - returns all analysis data
resolver.define('getData', async ({ payload, context }) => {
  const {
    demandJql = 'project = DEV and Summary !~ Capacity',
    capacityJql = 'project = DEV and Summary ~ Capacity'
  } = payload || {};

  try {
    // Fetch demand and capacity issues in parallel
    const [demandIssues, capacityIssues] = await Promise.all([
      fetchDemandIssues(demandJql),
      fetchCapacityIssues(capacityJql)
    ]);

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
        capacityJql: 'project = DEV and Summary ~ Capacity'
      }
    };
  } catch (error) {
    console.error('Error loading config:', error);
    return { success: false, error: error.message };
  }
});

export const handler = resolver.getDefinitions();
