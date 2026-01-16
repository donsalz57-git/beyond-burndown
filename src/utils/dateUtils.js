/**
 * Date parsing and formatting utilities
 */

/**
 * Parse a date string from Jira into a Date object
 * Handles ISO 8601 formats and plain date strings
 * @param {string|null} dateString - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseJiraDate(dateString) {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Parse Jira duration (seconds) to hours
 * @param {number|null} seconds - Duration in seconds
 * @returns {number} Duration in hours
 */
export function secondsToHours(seconds) {
  if (!seconds || typeof seconds !== 'number') return 0;
  return seconds / 3600;
}

/**
 * Check if a date is in the past
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is before today
 */
export function isPast(date) {
  if (!date) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if a date is today
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  if (!date) return false;
  const today = new Date();
  return (
    date.getUTCFullYear() === today.getUTCFullYear() &&
    date.getUTCMonth() === today.getUTCMonth() &&
    date.getUTCDate() === today.getUTCDate()
  );
}

/**
 * Get today's date at midnight UTC
 * @returns {Date} Today's date
 */
export function getToday() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string (e.g., "Jan 15, 2026")
 */
export function formatDisplayDate(date) {
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

/**
 * Format date for short display
 * @param {Date} date - Date to format
 * @returns {string} Short formatted date (e.g., "Jan 15")
 */
export function formatShortDate(date) {
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

/**
 * Calculate days difference between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Days difference (positive if date2 > date1)
 */
export function daysDifference(date1, date2) {
  if (!date1 || !date2) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
}
