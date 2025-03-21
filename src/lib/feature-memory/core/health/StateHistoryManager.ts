import { TimestampedEntry } from './types'
import { getCurrentTime } from '../../../utils/time'

/**
 * StateHistoryManager
 * 
 * Manages timestamped health state entries with capabilities for time-based queries,
 * trend analysis, and efficient storage with automatic cleanup of older entries.
 * 
 * @template T Type of entries to store, must extend TimestampedEntry (contain a timestamp field)
 */
export class StateHistoryManager<T extends TimestampedEntry> {
  private entries: T[] = []
  private readonly maxEntries: number
  
  /**
   * Creates a new StateHistoryManager
   * 
   * @param maxEntries Maximum number of entries to store before oldest are removed
   */
  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries
  }

  /**
   * Adds a new entry to the history
   * Automatically removes oldest entries if the history exceeds maxEntries
   * 
   * @param entry The entry to add
   * @returns The added entry
   */
  public addEntry(entry: T): T {
    // Ensure we have a timestamp
    if (!entry.timestamp) {
      entry = { ...entry, timestamp: getCurrentTime() }
    }

    this.entries.push(entry)
    
    // Remove oldest entries if we exceed the limit
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(this.entries.length - this.maxEntries)
    }
    
    return entry
  }

  /**
   * Gets all entries in the history
   * 
   * @returns Array of all stored entries
   */
  public getHistory(): T[] {
    return [...this.entries]
  }
  
  /**
   * Gets entries within a specific time range
   * 
   * @param startTime Start timestamp of the range (inclusive)
   * @param endTime End timestamp of the range (inclusive)
   * @returns Array of entries within the time range
   */
  public getTimeRange(startTime: number, endTime: number): T[] {
    return this.entries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    )
  }
  
  /**
   * Gets the most recent entries
   * 
   * @param count Number of recent entries to retrieve
   * @returns Array of the most recent entries
   */
  public getLast(count: number): T[] {
    return this.entries.slice(-Math.min(count, this.entries.length))
  }
  
  /**
   * Gets entries from the specified time window until now
   * 
   * @param windowMs Time window in milliseconds from now
   * @returns Array of entries within the time window
   */
  public getRecentWindow(windowMs: number): T[] {
    const now = getCurrentTime()
    const startTime = now - windowMs
    return this.getTimeRange(startTime, now)
  }
  
  /**
   * Gets the current number of entries in the history
   * 
   * @returns Number of entries currently stored
   */
  public getEntryCount(): number {
    return this.entries.length
  }
  
  /**
   * Clears all entries from the history
   */
  public clear(): void {
    this.entries = []
  }
  
  /**
   * Analyzes patterns in stored entries based on a property
   * 
   * @param propertyPath Path to the property to analyze (dot notation, e.g. 'indicators.memory.status')
   * @returns Object with frequency counts for each value of the property
   */
  public analyzePatterns(propertyPath: string): Record<string, number> {
    const patterns: Record<string, number> = {}
    
    // Extract property values using the path
    for (const entry of this.entries) {
      const value = this.getNestedProperty(entry, propertyPath)
      
      if (value !== undefined) {
        const valueStr = String(value)
        patterns[valueStr] = (patterns[valueStr] || 0) + 1
      }
    }
    
    return patterns
  }
  
  /**
   * Calculates the rate of changes for a property over time
   * 
   * @param propertyPath Path to the property to analyze changes for
   * @param timeWindowMs Time window in milliseconds to analyze
   * @returns Change frequency (changes per minute)
   */
  public calculateChangeRate(propertyPath: string, timeWindowMs: number = 60000): number {
    const recentEntries = this.getRecentWindow(timeWindowMs)
    if (recentEntries.length < 2) return 0
    
    let changeCount = 0
    let lastValue: any = undefined
    
    for (const entry of recentEntries) {
      const value = this.getNestedProperty(entry, propertyPath)
      
      if (lastValue !== undefined && value !== lastValue) {
        changeCount++
      }
      
      lastValue = value
    }
    
    // Calculate changes per minute
    const timeSpanMinutes = timeWindowMs / 60000
    return changeCount / timeSpanMinutes
  }
  
  /**
   * Analyzes trends by comparing values over different time windows
   * 
   * @param propertyPath Path to the numeric property to analyze
   * @param shortWindowMs Recent time window in milliseconds
   * @param longWindowMs Longer time window in milliseconds for comparison
   * @returns Trend analysis with direction and magnitude
   */
  public analyzeTrend(propertyPath: string, shortWindowMs: number = 60000, longWindowMs: number = 300000): {
    direction: 'increasing' | 'decreasing' | 'stable',
    magnitude: number,
    shortTermAverage: number,
    longTermAverage: number
  } {
    const recentEntries = this.getRecentWindow(shortWindowMs)
    const historicalEntries = this.getRecentWindow(longWindowMs)
    
    if (recentEntries.length === 0 || historicalEntries.length === 0) {
      return {
        direction: 'stable',
        magnitude: 0,
        shortTermAverage: 0,
        longTermAverage: 0
      }
    }
    
    // Calculate averages for both windows
    const shortTermValues = recentEntries
      .map(entry => this.getNestedProperty(entry, propertyPath))
      .filter(value => typeof value === 'number') as number[]
      
    const longTermValues = historicalEntries
      .map(entry => this.getNestedProperty(entry, propertyPath))
      .filter(value => typeof value === 'number') as number[]
      
    if (shortTermValues.length === 0 || longTermValues.length === 0) {
      return {
        direction: 'stable',
        magnitude: 0,
        shortTermAverage: 0,
        longTermAverage: 0
      }
    }
    
    const shortTermAverage = this.calculateAverage(shortTermValues)
    const longTermAverage = this.calculateAverage(longTermValues)
    
    // Calculate trend direction and magnitude
    const difference = shortTermAverage - longTermAverage
    const percentChange = longTermAverage !== 0 ? (difference / longTermAverage) * 100 : 0
    
    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (Math.abs(percentChange) >= 5) {
      direction = percentChange > 0 ? 'increasing' : 'decreasing'
    }
    
    return {
      direction,
      magnitude: Math.abs(percentChange),
      shortTermAverage,
      longTermAverage
    }
  }
  
  /**
   * Helper method to safely get a nested property using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((o, prop) => {
      return o && o[prop] !== undefined ? o[prop] : undefined
    }, obj)
  }
  
  /**
   * Helper method to calculate average of numeric values
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }
}