/**
 * Time utility functions for timestamp management in the application
 */

/**
 * Gets the current time in milliseconds since epoch
 * @returns Current timestamp in milliseconds
 */
export function getCurrentTime(): number {
  return Date.now()
}

/**
 * Formats a timestamp into a human-readable format
 * @param timestamp Timestamp in milliseconds since epoch
 * @returns Formatted date string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

/**
 * Calculates time difference between two timestamps in milliseconds
 * @param startTime Start timestamp in milliseconds
 * @param endTime End timestamp in milliseconds (defaults to current time)
 * @returns Time difference in milliseconds
 */
export function getTimeDifference(startTime: number, endTime: number = getCurrentTime()): number {
  return endTime - startTime
}

/**
 * Creates a timestamp for a specific time period in the past
 * @param milliseconds Number of milliseconds to go back from current time
 * @returns Timestamp in milliseconds for the past time
 */
export function getPastTimestamp(milliseconds: number): number {
  return getCurrentTime() - milliseconds
}