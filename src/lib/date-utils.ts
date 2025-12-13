/**
 * Date utility functions for consistent date handling across the application
 *
 * IMPORTANT: All "this week" and "this month" calculations should use these
 * utilities to ensure consistency across dashboard, patterns, and gamification views.
 */

/**
 * Get date N days ago at midnight (start of day)
 * This ensures consistent date comparisons by removing time components
 *
 * @param days Number of days to go back
 * @returns ISO date string (YYYY-MM-DD format, date-only)
 */
export function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

/**
 * Get start of week (7 days ago) at midnight
 *
 * @returns ISO date string (YYYY-MM-DD format)
 */
export function getStartOfWeek(): string {
  return getDateDaysAgo(7)
}

/**
 * Get start of month (30 days ago) at midnight
 *
 * @returns ISO date string (YYYY-MM-DD format)
 */
export function getStartOfMonth(): string {
  return getDateDaysAgo(30)
}

/**
 * Get today's date at midnight
 *
 * @returns ISO date string (YYYY-MM-DD format)
 */
export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check if a date string is within the last N days
 * Compares dates without time components for consistency
 *
 * @param dateString ISO date string to check
 * @param days Number of days to look back
 * @returns true if the date is within the last N days (inclusive)
 */
export function isWithinLastNDays(dateString: string, days: number): boolean {
  const targetDate = dateString.split('T')[0] // Remove time component
  const cutoffDate = getDateDaysAgo(days)
  return targetDate >= cutoffDate
}

/**
 * Check if a date is within this week (last 7 days)
 *
 * @param dateString ISO date string to check
 * @returns true if the date is within the last 7 days
 */
export function isThisWeek(dateString: string): boolean {
  return isWithinLastNDays(dateString, 7)
}

/**
 * Check if a date is within this month (last 30 days)
 *
 * @param dateString ISO date string to check
 * @returns true if the date is within the last 30 days
 */
export function isThisMonth(dateString: string): boolean {
  return isWithinLastNDays(dateString, 30)
}

/**
 * Get date N months ago
 * This handles month boundaries correctly
 *
 * @param months Number of months to go back
 * @returns ISO date string (YYYY-MM-DD format)
 */
export function getDateMonthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString().split('T')[0]
}
