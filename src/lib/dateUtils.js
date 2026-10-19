/**
 * Zyrbit — Centralized Authoritative Date & Time Utility
 * 
 * Provides consistent local-date formatting and timezone handling across all domains.
 * Prevents UTC-offset drift where midnight local time shifts to yesterday/tomorrow.
 */

/**
 * Returns a YYYY-MM-DD string representing a given Date in local time.
 * Defaults to current local date if no date is provided.
 * 
 * @param {Date|number|string} [dateInput=new Date()] - Date instance, timestamp, or parseable string
 * @returns {string} YYYY-MM-DD date string
 */
export function getLocalDateStr(dateInput = new Date()) {
  const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    // Fallback to today if invalid
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split('T')[0];
  }
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the local timezone.
 * Authoritative replacement for duplicate todayStr() implementations.
 * 
 * @returns {string} YYYY-MM-DD
 */
export function todayStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}

/**
 * Backward-compatible alias for todayStr() used across Dex intent parsers.
 * 
 * @returns {string} YYYY-MM-DD
 */
export const getLocalTodayStr = todayStr;

/**
 * Returns yesterday's date formatted as YYYY-MM-DD in the local timezone.
 * 
 * @param {Date} [referenceDate=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export function getYesterdayStr(referenceDate = new Date()) {
  const d = referenceDate instanceof Date ? new Date(referenceDate.getTime()) : new Date(referenceDate);
  d.setDate(d.getDate() - 1);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}

/**
 * Returns tomorrow's date formatted as YYYY-MM-DD in the local timezone.
 * 
 * @param {Date} [referenceDate=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export function getTomorrowStr(referenceDate = new Date()) {
  const d = referenceDate instanceof Date ? new Date(referenceDate.getTime()) : new Date(referenceDate);
  d.setDate(d.getDate() + 1);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}

/**
 * Validates whether a string is a strictly valid YYYY-MM-DD calendar date.
 * Validates month bounds (1-12) and day bounds for the specific month/leap year.
 * 
 * @param {any} str
 * @returns {boolean}
 */
export function isValidDateStr(str) {
  if (typeof str !== 'string') return false;
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const d = new Date(year, month, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month &&
    d.getDate() === day
  );
}

/**
 * Formats a date-only string or Date object into a readable local date.
 * If given a 'YYYY-MM-DD' string, treats it as a calendar date without timezone shift.
 * 
 * @param {string|Date} dateVal - Date string or Date instance
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatLocalDate(dateVal, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [year, month, day] = dateVal.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', options);
  }
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (Number.isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-US', options);
}
