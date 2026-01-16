/**
 * Business day calculation utilities
 * Excludes weekends (Saturday = 6, Sunday = 0)
 */

/**
 * Check if a date is a business day (Monday-Friday)
 * @param {Date} date - Date to check
 * @returns {boolean} True if business day
 */
export function isBusinessDay(date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

/**
 * Get all business days between two dates (inclusive)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Date[]} Array of business day dates
 */
export function getBusinessDaysBetween(startDate, endDate) {
  const businessDays = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  while (current <= end) {
    if (isBusinessDay(current)) {
      businessDays.push(new Date(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return businessDays;
}

/**
 * Count business days between two dates (inclusive)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of business days
 */
export function countBusinessDays(startDate, endDate) {
  return getBusinessDaysBetween(startDate, endDate).length;
}

/**
 * Add business days to a date
 * @param {Date} date - Starting date
 * @param {number} days - Number of business days to add
 * @returns {Date} Resulting date
 */
export function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  const direction = days >= 0 ? 1 : -1;
  const target = Math.abs(days);

  while (added < target) {
    result.setUTCDate(result.getUTCDate() + direction);
    if (isBusinessDay(result)) {
      added++;
    }
  }

  return result;
}

/**
 * Get date range spanning all provided dates with buffer
 * @param {Date[]} dates - Array of dates
 * @param {number} bufferDays - Business days to add as buffer
 * @returns {{ start: Date, end: Date }} Date range
 */
export function getDateRange(dates, bufferDays = 5) {
  if (!dates.length) {
    const today = new Date();
    return {
      start: today,
      end: addBusinessDays(today, 20)
    };
  }

  const validDates = dates.filter(d => d instanceof Date && !isNaN(d));
  if (!validDates.length) {
    const today = new Date();
    return {
      start: today,
      end: addBusinessDays(today, 20)
    };
  }

  const timestamps = validDates.map(d => d.getTime());
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  return {
    start: addBusinessDays(minDate, -bufferDays),
    end: addBusinessDays(maxDate, bufferDays)
  };
}

/**
 * Format date as YYYY-MM-DD string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}
