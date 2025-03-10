# Test Infrastructure

This directory contains a streamlined test infrastructure for validating resource management, error handling, and health monitoring in the Audio Learning Hub.

## Core Components

### ErrorTestUtils
Utility class for creating and validating test errors:
```typescript
// Create resource errors
const error = ErrorTestUtils.createResourceError('exhausted');

// Create errors with context
const error = ErrorTestUtils.createErrorWithContext('Custom error', {
  code: 'CUSTOM_ERROR',
  details: { /* context details */ }
});
```

### TestContext
Main test context that manages resource pool and health monitoring:
```typescript
// Create test context
const context = await TestContext.create();

// Mock errors and verify health state
await context.mockError(error);
expect(context.healthMonitor.getStatus()).toBe('warning');

// Reset state between tests
await context.reset();
```

### TestResourcePool
Simulates resource management operations:
```typescript
// Check resource metrics
const metrics = context.resourcePool.getMetrics();
expect(metrics.lastError).toBe(null);
```

### TestHealthMonitor
Tracks system health state:
```typescript
// Monitor health transitions
expect(context.healthMonitor.getStatus()).toBe('healthy');
const state = context.healthMonitor.getFullState();
expect(state.errorCount).toBe(0);
```

## Test Organization

Tests are organized by core functionality:
- Error handling and propagation
- Health state transitions
- Resource pool management
- State cleanup and recovery

## Usage Example

```typescript
describe('Error Handling', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await TestContext.create();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  it('handles resource exhaustion', async () => {
    expect.assertions(2);
    const error = ErrorTestUtils.createResourceError('exhausted');
    
    try {
      await context.mockError(error);
    } catch (e) {
      expect(context.healthMonitor.getStatus()).toBe('warning');
      expect(context.resourcePool.getMetrics().lastError).toBe(error);
    }
  });
});
```

## Implementation Notes

- Error handling flows through TestContext to ensure proper state updates
- Health states transition from healthy -> warning -> error based on error count
- Resource pool tracks the last error for verification
- All components support proper cleanup and state reset

## Running Tests

```bash
# Run specific test file
npm test src/lib/testing/__tests__/error-handling.test.ts

# Run all tests
npm test