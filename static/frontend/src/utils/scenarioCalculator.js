/**
 * Scenario Calculator - Frontend-only recalculation of feasibility scores
 * based on hypothetical changes to capacity, scope, or deadline
 */

/**
 * Recalculate feasibility score based on modified capacity and demand
 * @param {number} capacity - Total capacity in hours
 * @param {number} demand - Total demand in hours
 * @param {number} overloadedDays - Number of overloaded days
 * @param {number} totalDays - Total business days
 * @returns {number} New feasibility score (0-100)
 */
function recalculateFeasibility(capacity, demand, overloadedDays, totalDays) {
  if (demand === 0) return 100;
  if (capacity === 0) return 0;

  const coverageRatio = Math.min(1, capacity / demand);

  // Estimate new overloaded days based on coverage ratio
  let adjustedOverloadedDays = overloadedDays;
  if (capacity >= demand) {
    adjustedOverloadedDays = 0;
  } else {
    // Proportionally adjust overloaded days
    const gap = demand - capacity;
    const gapRatio = gap / demand;
    adjustedOverloadedDays = Math.round(totalDays * gapRatio);
  }

  const overloadPenalty = totalDays > 0
    ? Math.min(0.3, (adjustedOverloadedDays / totalDays) * 0.5)
    : 0;

  const score = (coverageRatio - overloadPenalty) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculate new forecast date based on capacity and demand
 * @param {number} capacity - Total capacity
 * @param {number} demand - Total demand
 * @param {number} avgDailyCapacity - Average daily capacity
 * @returns {Object} Forecast info
 */
function calculateNewForecast(capacity, demand, avgDailyCapacity) {
  if (capacity >= demand) {
    return { extraDays: 0, status: 'on_track' };
  }

  const gap = demand - capacity;
  const extraDays = avgDailyCapacity > 0 ? Math.ceil(gap / avgDailyCapacity) : null;

  return {
    extraDays,
    status: extraDays > 10 ? 'critical' : extraDays > 5 ? 'warning' : 'minor'
  };
}

/**
 * Apply "Add Capacity" scenario
 * @param {Object} envelope - Current envelope data
 * @param {number} additionalDevelopers - Number of developers to add
 * @param {number} hoursPerDeveloperPerDay - Hours per developer per day (default 6)
 * @returns {Object} Scenario result
 */
export function applyAddCapacity(envelope, additionalDevelopers, hoursPerDeveloperPerDay = 6) {
  const { totals, timeline, feasibilityScore, forecast } = envelope;

  const additionalCapacity = additionalDevelopers * hoursPerDeveloperPerDay * totals.totalDays;
  const newCapacity = totals.totalCapacity + additionalCapacity;
  const newDemand = totals.totalDemand;

  const overloadedDays = timeline.filter(d => d.isOverloaded).length;
  const newFeasibility = recalculateFeasibility(newCapacity, newDemand, overloadedDays, totals.totalDays);
  const newForecast = calculateNewForecast(newCapacity, newDemand, forecast?.avgDailyCapacity || (totals.totalCapacity / totals.totalDays));

  return {
    type: 'add_capacity',
    description: `Add ${additionalDevelopers} developer${additionalDevelopers !== 1 ? 's' : ''}`,
    original: {
      feasibilityScore,
      capacity: totals.totalCapacity,
      forecastExtraDays: forecast?.extraDays || 0
    },
    result: {
      feasibilityScore: newFeasibility,
      capacity: newCapacity,
      forecastExtraDays: newForecast.extraDays || 0
    },
    delta: {
      feasibilityScore: newFeasibility - feasibilityScore,
      capacity: additionalCapacity,
      forecastExtraDays: (newForecast.extraDays || 0) - (forecast?.extraDays || 0)
    }
  };
}

/**
 * Apply "Remove Scope" scenario
 * @param {Object} envelope - Current envelope data
 * @param {number} hoursToRemove - Hours of demand to remove
 * @returns {Object} Scenario result
 */
export function applyRemoveScope(envelope, hoursToRemove) {
  const { totals, timeline, feasibilityScore, forecast } = envelope;

  const newDemand = Math.max(0, totals.totalDemand - hoursToRemove);
  const newCapacity = totals.totalCapacity;

  const overloadedDays = timeline.filter(d => d.isOverloaded).length;
  const newFeasibility = recalculateFeasibility(newCapacity, newDemand, overloadedDays, totals.totalDays);
  const newForecast = calculateNewForecast(newCapacity, newDemand, forecast?.avgDailyCapacity || (totals.totalCapacity / totals.totalDays));

  return {
    type: 'remove_scope',
    description: `Remove ${hoursToRemove}h of scope`,
    original: {
      feasibilityScore,
      demand: totals.totalDemand,
      forecastExtraDays: forecast?.extraDays || 0
    },
    result: {
      feasibilityScore: newFeasibility,
      demand: newDemand,
      forecastExtraDays: newForecast.extraDays || 0
    },
    delta: {
      feasibilityScore: newFeasibility - feasibilityScore,
      demand: -hoursToRemove,
      forecastExtraDays: (newForecast.extraDays || 0) - (forecast?.extraDays || 0)
    }
  };
}

/**
 * Apply "Extend Deadline" scenario
 * @param {Object} envelope - Current envelope data
 * @param {number} additionalWeeks - Number of weeks to extend deadline
 * @returns {Object} Scenario result
 */
export function applyExtendDeadline(envelope, additionalWeeks) {
  const { totals, timeline, feasibilityScore, forecast } = envelope;

  // 5 business days per week
  const additionalDays = additionalWeeks * 5;
  const avgDailyCapacity = totals.totalDays > 0 ? totals.totalCapacity / totals.totalDays : 0;
  const additionalCapacity = avgDailyCapacity * additionalDays;

  const newCapacity = totals.totalCapacity + additionalCapacity;
  const newDemand = totals.totalDemand;
  const newTotalDays = totals.totalDays + additionalDays;

  const overloadedDays = timeline.filter(d => d.isOverloaded).length;
  const newFeasibility = recalculateFeasibility(newCapacity, newDemand, overloadedDays, newTotalDays);

  // Calculate buffer gained
  const originalGap = totals.totalDemand - totals.totalCapacity;
  const newGap = newDemand - newCapacity;
  const bufferGained = originalGap - newGap;

  return {
    type: 'extend_deadline',
    description: `Extend deadline by ${additionalWeeks} week${additionalWeeks !== 1 ? 's' : ''}`,
    original: {
      feasibilityScore,
      capacity: totals.totalCapacity,
      forecastExtraDays: forecast?.extraDays || 0
    },
    result: {
      feasibilityScore: newFeasibility,
      capacity: newCapacity,
      forecastExtraDays: Math.max(0, (forecast?.extraDays || 0) - additionalDays)
    },
    delta: {
      feasibilityScore: newFeasibility - feasibilityScore,
      capacity: additionalCapacity,
      bufferGained
    }
  };
}
