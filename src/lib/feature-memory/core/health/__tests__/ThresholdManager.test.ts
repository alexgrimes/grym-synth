import { ThresholdManager } from '../ThresholdManager'
import { StateHistoryManager } from '../StateHistoryManager'
import { HealthState, HealthStatusType, ThresholdConfig, ThresholdContext } from '../types'
import { getCurrentTime } from '../../../../utils/time'

// Mock getCurrentTime to return predictable values
jest.mock('../../../../utils/time', () => ({
  getCurrentTime: jest.fn()
}))

describe('ThresholdManager', () => {
  let thresholdManager: ThresholdManager
  let stateHistoryManager: StateHistoryManager<HealthState>
  let baseThresholds: ThresholdConfig

  // Mock state history data
  const mockHealthState: HealthState = {
    status: HealthStatusType.Healthy,
    timestamp: 1000,
    indicators: {
      memory: { status: HealthStatusType.Healthy, score: 0.9 },
      performance: { status: HealthStatusType.Healthy, score: 0.85 },
      errors: { status: HealthStatusType.Healthy, score: 0.95 }
    }
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    const getCurrentTimeMock = getCurrentTime as jest.Mock
    getCurrentTimeMock.mockReturnValue(1000)

    // Create base thresholds
    baseThresholds = {
      memory: {
        heapUsage: {
          warning: 0.7,
          critical: 0.85,
          recovery: 0.65
        }
      },
      performance: {
        latency: {
          warning: 20,
          critical: 35,
          recovery: 15
        }
      },
      error: {
        errorRate: {
          warning: 0.03,
          critical: 0.08,
          recovery: 0.02
        }
      }
    }

    // Create state history manager with mock data
    stateHistoryManager = new StateHistoryManager<HealthState>(100)
    stateHistoryManager.addEntry({ ...mockHealthState, timestamp: 900 })
    stateHistoryManager.addEntry({ ...mockHealthState, timestamp: 950 })
    stateHistoryManager.addEntry({ ...mockHealthState, timestamp: 1000 })

    // Mock analyzeTrend method
    stateHistoryManager.analyzeTrend = jest.fn().mockReturnValue({
      direction: 'stable',
      magnitude: 0,
      shortTermAverage: 0.9,
      longTermAverage: 0.9
    })

    // Create threshold manager
    thresholdManager = new ThresholdManager(baseThresholds, stateHistoryManager)
  })

  describe('getThresholds', () => {
    it('returns base thresholds when no context is provided', () => {
      const thresholds = thresholdManager.getThresholds()
      expect(thresholds).toEqual(baseThresholds)
    })

    it('returns context-specific thresholds when available', () => {
      const context: ThresholdContext = {
        category: 'audio',
        operation: 'processing',
        systemLoad: 0.5
      }

      const customThresholds: ThresholdConfig = {
        memory: {
          heapUsage: {
            warning: 0.8,
            critical: 0.9,
            recovery: 0.7
          }
        },
        performance: {
          latency: {
            warning: 30,
            critical: 50,
            recovery: 25
          }
        },
        error: {
          errorRate: {
            warning: 0.05,
            critical: 0.1,
            recovery: 0.03
          }
        }
      }

      thresholdManager.registerContextProfile(context, customThresholds)

      const thresholds = thresholdManager.getThresholds(context)
      expect(thresholds).toEqual(customThresholds)
    })

    it('applies load factor to thresholds when context has systemLoad', () => {
      const context: ThresholdContext = {
        category: 'audio',
        operation: 'processing',
        systemLoad: 0.5
      }

      const thresholds = thresholdManager.getThresholds(context)

      // With 0.5 load, thresholds should be 25% more lenient
      expect(thresholds.memory.heapUsage.warning).toBeCloseTo(0.875, 3) // 0.7 * 1.25
      expect(thresholds.performance.latency.warning).toBeCloseTo(25, 3) // 20 * 1.25
      expect(thresholds.error.errorRate.warning).toBeCloseTo(0.0375, 3) // 0.03 * 1.25

      // Recovery thresholds should move in opposite direction
      expect(thresholds.memory.heapUsage.recovery).toBeCloseTo(0.52, 3) // 0.65 / 1.25
    })
  })

  describe('updateThresholds', () => {
    it('updates thresholds based on trends', () => {
      // Mock decreasing performance trend
      const analyzeTrendMock = stateHistoryManager.analyzeTrend as jest.Mock
      analyzeTrendMock.mockImplementation((metricPath) => {
        if (metricPath === 'indicators.performance.score') {
          return {
            direction: 'decreasing',
            magnitude: 15,
            shortTermAverage: 0.7,
            longTermAverage: 0.85
          }
        }
        return {
          direction: 'stable',
          magnitude: 0,
          shortTermAverage: 0.9,
          longTermAverage: 0.9
        }
      })

      thresholdManager.updateThresholds()
      const thresholds = thresholdManager.getThresholds()

      // Performance thresholds should be more lenient, but limited by hysteresis (5%)
      expect(thresholds.performance.latency.warning).toBeCloseTo(21, 3) // 20 + 20 * 0.05
      expect(thresholds.performance.latency.critical).toBeCloseTo(36.75, 3) // 35 + 35 * 0.05

      // Other thresholds should remain the same
      expect(thresholds.memory.heapUsage.warning).toBeCloseTo(0.7, 3)
      expect(thresholds.error.errorRate.warning).toBeCloseTo(0.03, 3)
    })

    it('applies hysteresis to prevent oscillation', () => {
      // Mock extreme trend that would cause large threshold changes
      const analyzeTrendMock = stateHistoryManager.analyzeTrend as jest.Mock
      analyzeTrendMock.mockImplementation((metricPath) => {
        if (metricPath === 'indicators.performance.score') {
          return {
            direction: 'decreasing',
            magnitude: 50,
            shortTermAverage: 0.4,
            longTermAverage: 0.9
          }
        }
        return {
          direction: 'stable',
          magnitude: 0,
          shortTermAverage: 0.9,
          longTermAverage: 0.9
        }
      })

      thresholdManager.updateThresholds()
      const thresholds = thresholdManager.getThresholds()

      // Hysteresis should limit changes to 5%
      const expectedWarning = 20 + 20 * 0.05 // 5% increase
      expect(thresholds.performance.latency.warning).toBeCloseTo(expectedWarning, 3)
    })
  })

  describe('learnFromOperation', () => {
    it('adjusts thresholds based on successful operations', () => {
      const context: ThresholdContext = {
        category: 'audio',
        operation: 'processing',
        systemLoad: 0.3
      }

      const metrics = {
        'memory.heapUsage': 0.6,
        'performance.latency': 18
      }

      thresholdManager.learnFromOperation(context, metrics)

      // Get the learned thresholds
      const thresholds = thresholdManager.getThresholds(context)

      // Warning threshold should be adjusted 10% towards the new value
      // 0.7 * 0.9 + (0.6 * 1.1) * 0.1 = 0.63 + 0.066 = 0.696
      expect(thresholds.memory.heapUsage.warning).toBeCloseTo(0.696, 3)

      // 20 * 0.9 + (18 * 1.1) * 0.1 = 18 + 1.98 = 19.98
      expect(thresholds.performance.latency.warning).toBeCloseTo(19.98, 3)

      // Critical and recovery thresholds should be adjusted proportionally
      const warningToCriticalRatio = 0.85 / 0.7 // From base thresholds
      expect(thresholds.memory.heapUsage.critical).toBeCloseTo(0.696 * warningToCriticalRatio, 3)
    })
  })

  describe('resetThresholds', () => {
    it('resets thresholds to base values', () => {
      // First modify thresholds
      const analyzeTrendMock = stateHistoryManager.analyzeTrend as jest.Mock
      analyzeTrendMock.mockImplementation(() => {
        return {
          direction: 'decreasing',
          magnitude: 15,
          shortTermAverage: 0.7,
          longTermAverage: 0.85
        }
      })

      thresholdManager.updateThresholds()

      // Then reset
      thresholdManager.resetThresholds()

      // Verify thresholds are reset
      const thresholds = thresholdManager.getThresholds()
      expect(thresholds).toEqual(baseThresholds)
    })
  })
})
