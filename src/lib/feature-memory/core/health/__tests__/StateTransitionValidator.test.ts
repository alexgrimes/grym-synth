import { StateTransitionValidator } from '../StateTransitionValidator'
import { HealthStatusType, HealthState } from '../types'
import { getCurrentTime } from '../../../../utils/time'

// Mock the time utility
jest.mock('../../../../utils/time')

// Helper type for test state strings
type TestHealthState = 'healthy' | 'degraded' | 'unhealthy'

// Map test strings to enum values
const mapToHealthStatusType = (state: TestHealthState): HealthStatusType => {
  switch (state) {
    case 'healthy':
      return HealthStatusType.Healthy
    case 'degraded':
      return HealthStatusType.Degraded
    case 'unhealthy':
      return HealthStatusType.Unhealthy
    default:
      return HealthStatusType.Healthy
  }
}

describe('StateTransitionValidator', () => {
  let validator: StateTransitionValidator
  let currentTime: number

  beforeEach(() => {
    currentTime = 1000
    ;(getCurrentTime as jest.Mock).mockImplementation(() => currentTime)

    validator = new StateTransitionValidator({
      minStateDuration: 500, // 500ms minimum time in a state
      maxTransitionsPerMinute: 10,
      confirmationSamples: 3,
      cooldownPeriod: 200
    })
    
    // For testing, we need to initialize the validator with states
    // and ensure we're past the minimum state duration
    validator.recordState(createHealthState('healthy'))
    
    // Advance time past minimum duration to allow transitions in tests
    currentTime += 600 // More than minStateDuration
    ;(getCurrentTime as jest.Mock).mockImplementation(() => currentTime)
  })

  describe('Valid State Transitions', () => {
    test('should allow transition from healthy to degraded', () => {
      const fromState = createHealthState('healthy')
      const toState = createHealthState('degraded')

      expect(validator.canTransition(fromState, toState)).toBe(true)
    })

    test('should allow transition from degraded to unhealthy', () => {
      const fromState = createHealthState('degraded')
      const toState = createHealthState('unhealthy')

      expect(validator.canTransition(fromState, toState)).toBe(true)
    })

    test('should allow recovery from degraded to healthy', () => {
      // First set up initial transition to degraded
      const healthyState = createHealthState('healthy')
      const degradedState = createHealthState('degraded')
      
      // Make sure we can transition to degraded first
      validator.recordTransition(healthyState, degradedState)
      
      // Add confirmation samples of sustained degraded state
      for (let i = 0; i < 3; i++) {
        currentTime += 200
        ;(getCurrentTime as jest.Mock).mockImplementation(() => currentTime)
        validator.recordState(degradedState)
      }
      
      // Advance time further to meet recovery requirements
      currentTime += 400
      ;(getCurrentTime as jest.Mock).mockImplementation(() => currentTime)
      
      // Now check if we can recover to healthy
      const toState = createHealthState('healthy')
      expect(validator.canTransition(degradedState, toState)).toBe(true)
    })
  })

  describe('Invalid State Transitions', () => {
    test('should not allow direct transition from healthy to unhealthy', () => {
      const fromState = createHealthState('healthy')
      const toState = createHealthState('unhealthy')

      expect(validator.canTransition(fromState, toState)).toBe(false)
    })

    test('should not allow direct transition from unhealthy to healthy', () => {
      const fromState = createHealthState('unhealthy')
      const toState = createHealthState('healthy')

      expect(validator.canTransition(fromState, toState)).toBe(false)
    })

    test('should not allow transition to same state', () => {
      const state = createHealthState('healthy')
      expect(validator.canTransition(state, state)).toBe(false)
    })
  })

  describe('Timing Constraints', () => {
    test('should enforce minimum state duration', () => {
      // Reset the validator to start with a clean state
      validator = new StateTransitionValidator({
        minStateDuration: 500,
        maxTransitionsPerMinute: 10,
        confirmationSamples: 1,
        cooldownPeriod: 200
      });
      
      const fromState = createHealthState('healthy')
      const toState = createHealthState('degraded')

      // Record initial state and set initial transition time
      validator.recordState(fromState)
      validator.lastTransitionTime = currentTime // Directly set for testing
      
      // Try transition before minimum duration
      currentTime += 300 // Less than minStateDuration
      ;(getCurrentTime as jest.Mock).mockImplementation(() => currentTime)
      
      // Should not allow transition yet due to minimum state duration
      expect(validator.canTransition(fromState, toState)).toBe(false)

      // Try after minimum duration
      currentTime += 300 // Total 600ms > minStateDuration
      ;(getCurrentTime as jest.Mock).mockImplementation(() => currentTime)
      
      // Now should allow transition
      expect(validator.canTransition(fromState, toState)).toBe(true)
    })

    test('should enforce maximum transitions per minute', () => {
      // Set up initial state
      const healthy = createHealthState('healthy')
      const degraded = createHealthState('degraded')
      
      // Reset to a clean state with just the initial healthy state
      validator = new StateTransitionValidator({
        minStateDuration: 100, // Use shorter times for this test
        maxTransitionsPerMinute: 5, // Lower limit for easier testing
        confirmationSamples: 1,
        cooldownPeriod: 50
      });
      
      validator.recordState(healthy);
      
      // Perform transitions up to the limit (back and forth)
      let currentState = healthy;
      let nextState = degraded;
      
      for (let i = 0; i < 5; i++) {
        // Advance time enough to allow transition
        currentTime += 150; // More than minStateDuration
        (getCurrentTime as jest.Mock).mockImplementation(() => currentTime);
        
        // Verify we can transition
        expect(validator.canTransition(currentState, nextState)).toBe(true);
        
        // Record the transition
        validator.recordTransition(currentState, nextState);
        
        // Swap states for next iteration
        [currentState, nextState] = [nextState, currentState];
      }
      
      // We've now hit our limit of 5 transitions per minute
      // Try another transition - it should be blocked
      currentTime += 150;
      (getCurrentTime as jest.Mock).mockImplementation(() => currentTime);
      
      expect(validator.canTransition(currentState, nextState)).toBe(false);
      
      // After waiting more than a minute, we should be able to transition again
      currentTime += 61000; // Just over a minute
      (getCurrentTime as jest.Mock).mockImplementation(() => currentTime);
      
      expect(validator.canTransition(currentState, nextState)).toBe(true);
    })
  })

  describe('Recovery Conditions', () => {
    test('should require confirmation samples for recovery to healthy', () => {
      // Create a fresh validator with simpler configs for testing
      validator = new StateTransitionValidator({
        minStateDuration: 100,
        maxTransitionsPerMinute: 10,
        confirmationSamples: 2, // Only require 2 samples for easier testing
        cooldownPeriod: 50
      });
      
      // First establish a healthy state
      const healthyState = createHealthState('healthy');
      validator.recordState(healthyState);
      
      // Then transition to degraded
      currentTime += 150;
      (getCurrentTime as jest.Mock).mockImplementation(() => currentTime);
      
      const degradedState = createHealthState('degraded');
      validator.recordTransition(healthyState, degradedState);
      
      // With just one confirmation sample, recovery should be blocked
      currentTime += 150;
      (getCurrentTime as jest.Mock).mockImplementation(() => currentTime);
      
      // Attempt to recover too early
      expect(validator.canTransition(degradedState, healthyState)).toBe(false);
      
      // Add second confirmation sample and advance time
      validator.recordState(degradedState);
      currentTime += 200;
      (getCurrentTime as jest.Mock).mockImplementation(() => currentTime);
      
      // Now with enough confirmation and time, should allow recovery
      expect(validator.canTransition(degradedState, healthyState)).toBe(true);
    })

    test('should require longer confirmation for unhealthy recovery', () => {
      const fromState = createHealthState('unhealthy')
      const toState = createHealthState('degraded')

      // Add confirmation samples but not enough time
      for (let i = 0; i < 3; i++) {
        validator.recordState(createHealthState('unhealthy'))
        currentTime += 200 // Only 600ms total
        ;(getCurrentTime as jest.Mock).mockImplementation(() => currentTime)
      }

      expect(validator.canTransition(fromState, toState)).toBe(false)

      // Add more time to meet extended duration requirement
      currentTime += 400 // Total 1000ms
      ;(getCurrentTime as jest.Mock).mockImplementation(() => currentTime)

      expect(validator.canTransition(fromState, toState)).toBe(true)
    })

    test('should reset confirmation count on state changes', () => {
      const degradedState = createHealthState('degraded')
      const healthyState = createHealthState('healthy')

      // Add some confirmation samples
      for (let i = 0; i < 2; i++) {
        validator.recordState(degradedState)
        currentTime += 200
        ;(getCurrentTime as jest.Mock).mockImplementation(() => currentTime)
      }

      // Record a different state
      validator.recordState(healthyState)
      currentTime += 200
      ;(getCurrentTime as jest.Mock).mockImplementation(() => currentTime)

      // Should need to start confirmation count over
      expect(validator.canTransition(degradedState, healthyState)).toBe(false)
    })
  })
})

function createHealthState(status: TestHealthState): HealthState {
  const statusType = mapToHealthStatusType(status)
  return {
    status: statusType,
    indicators: {
      memory: { status: statusType },
      performance: { status: statusType },
      errors: { status: statusType }
    },
    timestamp: getCurrentTime()
  }
}
