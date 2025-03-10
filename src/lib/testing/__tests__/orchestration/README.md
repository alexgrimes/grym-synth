# Model Orchestration Tests

Core test infrastructure for validating model orchestration, error handling, and state management.

## Key Components

### TestContext
```typescript
class TestContext {
  readonly projectManager: TestProjectManager;  // Manages test models
  readonly resourcePool: TestResourcePool;      // Simulates resource operations
  readonly healthMonitor: TestHealthMonitor;    // Tracks system health
}
```

### Model State Management
- Tracks active model for targeted error handling
- Updates model states during errors
- Maintains consistency through handoffs
- Supports clean recovery

### Error Propagation Flow
1. Error occurs in resource pool
2. Health monitor updates status
3. Active model transitions to error state
4. System moves to warning/error based on count
5. Reset restores clean state

## Test Categories

### Model Handoff
```typescript
it('handles errors during model handoff', async () => {
  const source = await context.projectManager.createModel('audio');
  const target = await context.projectManager.createModel('pattern');
  await context.mockHandoffError(source, target);
  // Verify error states
});
```

### Error Recovery
```typescript
it('recovers from partial verification failures', async () => {
  // Test system recovery after errors
  // Verify health state transitions
  // Check model state cleanup
});
```

### State Management
```typescript
it('maintains model state consistency', async () => {
  // Test cascading failures
  // Verify all model states
  // Check system health escalation
});
```

## Usage

1. Create test context:
```typescript
const context = await TestContext.create();
```

2. Set up models:
```typescript
const model = await context.projectManager.createModel('type');
```

3. Simulate errors:
```typescript
await context.mockError(error);
// or
await context.mockHandoffError(source, target);
```

4. Verify states:
```typescript
expect(context.healthMonitor.getStatus()).toBe('warning');
expect(model.status).toBe('error');
```

5. Clean up:
```typescript
await context.cleanup();