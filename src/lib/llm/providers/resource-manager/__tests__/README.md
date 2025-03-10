# Error Handling Tests

## Overview

This directory contains the test suite for error handling in the resource manager. The tests are organized according to the [Error Handling Test Plan](../../../../../docs/ERROR-HANDLING-TEST-PLAN.md).

## Test Organization

The tests are split into four main categories:

1. `circuit-breaker.test.ts` - Tests for circuit breaker functionality
2. `message-validation.test.ts` - Tests for message content validation
3. `resource-management.test.ts` - Tests for resource limits and cleanup
4. `recovery-strategies.test.ts` - Tests for error recovery mechanisms

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- circuit-breaker.test.ts

# Run tests in watch mode
npm test -- --watch
```

## Test Helpers

Common test utilities are available in `test-helpers.ts`:

- `createErrorScenario()` - Creates test error scenarios
- `simulateResourcePressure()` - Simulates memory pressure
- `mockCircuitBreakerState()` - Mocks circuit breaker states
- `createTestMessage()` - Creates test messages

## Best Practices

1. **Test Isolation**
   - Reset state in `beforeEach`
   - Clean up resources in `afterEach`
   - Avoid test interdependencies

2. **Mocking**
   - Use `jest.spyOn()` for monitoring function calls
   - Mock `Date.now()` for time-based tests
   - Reset mocks in `afterEach`

3. **Assertions**
   - Use specific assertions (e.g., `toBeInstanceOf`)
   - Check error types and messages
   - Verify state changes

4. **Resource Management**
   - Always clean up resources
   - Test memory pressure scenarios
   - Verify resource release

## Common Patterns

### Testing Circuit Breaker

```typescript
describe('Circuit Breaker', () => {
  it('should open after failures', async () => {
    const isCircuitOpenSpy = jest.spyOn(contextManager as any, 'isCircuitOpen');
    // Trigger failures
    // Assert circuit opens
    expect(isCircuitOpenSpy).toHaveBeenCalled();
  });
});
```

### Testing Resource Cleanup

```typescript
describe('Resource Cleanup', () => {
  it('should cleanup after errors', async () => {
    await contextManager.initializeContext(modelId, constraints);
    // Simulate error
    // Verify cleanup
    const context = await contextManager.getContext(modelId);
    expect(context).toBeUndefined();
  });
});
```

## Error Types

Common error types used in tests:

```typescript
type ErrorType =
  | 'CIRCUIT_BREAKER'
  | 'RESOURCE_EXHAUSTED'
  | 'INVALID_MESSAGE'
  | 'CONTEXT_NOT_FOUND';
```

## Adding New Tests

1. Create test file in appropriate category
2. Import required helpers and types
3. Follow existing patterns for setup/teardown
4. Add clear test descriptions
5. Include error scenarios
6. Test recovery paths

## Debugging Tests

1. Use `test.only()` to run specific tests
2. Enable debug logging with `DEBUG=true`
3. Check test coverage with `npm test -- --coverage`
4. Use Jest snapshots for complex objects

## Test Coverage Goals

- Circuit Breaker: 100% coverage
- Message Validation: 100% coverage
- Resource Management: 95% coverage
- Recovery Strategies: 90% coverage

## Related Documentation

- [Error Handling Test Plan](../../../../../docs/ERROR-HANDLING-TEST-PLAN.md)
- [TDR-002: Error Recovery System](../../../../../docs/TDR-002-ERROR-RECOVERY.md)
- [Resource Management Guide](../../../../../docs/RESOURCE-MANAGEMENT-GUIDE.md)

## Contributing

1. Review the test plan
2. Follow test organization
3. Use provided helpers
4. Maintain test isolation
5. Update documentation