import Resolver from '@forge/resolver';
import { fetchDemandIssues, fetchWorklogs } from './resolvers/fetchDemand';
import { fetchCapacityIssues } from './resolvers/fetchCapacity';
import { analyzeEnvelope } from './resolvers/analyzeEnvelope';
import { checkCompliance } from './resolvers/checkCompliance';
import { buildDependencies } from './resolvers/buildDependencies';

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
    const [envelope, compliance, dependencies] = await Promise.all([
      analyzeEnvelope(demandIssues, capacityIssues, worklogs),
      checkCompliance(demandIssues),
      buildDependencies(demandIssues)
    ]);

    return {
      success: true,
      data: {
        envelope,
        compliance,
        dependencies,
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

// Save gadget configuration
resolver.define('saveConfig', async ({ payload, context }) => {
  const { storage } = await import('@forge/api');
  const gadgetId = context.extension?.gadget?.id || 'default';

  try {
    await storage.set(`config-${gadgetId}`, payload);
    return { success: true };
  } catch (error) {
    console.error('Error saving config:', error);
    return { success: false, error: error.message };
  }
});

// Load gadget configuration
resolver.define('loadConfig', async ({ context }) => {
  const { storage } = await import('@forge/api');
  const gadgetId = context.extension?.gadget?.id || 'default';

  try {
    const config = await storage.get(`config-${gadgetId}`);
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
