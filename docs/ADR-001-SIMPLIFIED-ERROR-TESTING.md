# ADR 001: Simplified Error Testing

## Status
Proposed

## Context
Our error handling tests are currently:
- Testing multiple behaviors in single tests
- Creating side effects that impact other tests
- Making test failures hard to diagnose
- Mixing concerns (e.g., circuit breaker with resource management)

The complex test structure is making it difficult to:
1. Fix failing tests
2. Understand error scenarios
3. Maintain the test suite
4. Add new error handling features

## Decision
We will simplify our error handling tests by:

1. Breaking down complex tests into single-purpose tests
2. Starting with the circuit breaker as a focused example:
```typescript
it('should limit repeated failures', async () => {
  const contextManager = new ContextManager();
  let attempts = 0;
  
  jest.spyOn(contextManager as any, 'calculateTokenCount')
    .mockImplementation(() => {
      attempts++;
      throw new Error('Test failure');
    });

  for (let i = 0; i < 6; i++) {
    try {
      await contextManager.addMessage('test', createTestMessage('test'));
    } catch (error) {
      // Expected to fail
    }
  }
  
  expect(attempts).toBeLessThan(5);
});
```

3. Following this pattern for other error handling tests:
- One behavior per test
- Clear setup and expectations
- No side effects
- Simple failure scenarios first

## Consequences

### Positive
- Easier to understand test failures
- Simpler to maintain
- Clear behavior boundaries
- Better test isolation
- Faster test runs

### Negative
- Need to write more individual tests
- May miss some edge cases initially
- Have to refactor existing tests

## Implementation Strategy

1. Start with circuit breaker test
   - Implement basic failure counting
   - Verify threshold behavior
   - Test error types

2. Move to message validation
   - Basic content validation
   - Type checking
   - Error messages

3. Add context cleanup
   - Resource cleanup
   - State management
   - Event handling

## Success Metrics

1. Test Reliability
   - No flaky tests
   - Consistent results
   - Clear failure messages

2. Development Velocity
   - Faster test runs
   - Quicker bug fixes
   - Easier to add tests

3. Code Quality
   - Better error handling
   - Clearer behavior boundaries
   - More maintainable code

## References

- [Original Error Handling Tests](../src/lib/llm/providers/resource-manager/__tests__/error-handling.test.ts)
- [Simplified Error Handling Approach](./SIMPLIFIED-ERROR-HANDLING.md)
- [TDR-002: Error Recovery System](./TDR-002-ERROR-RECOVERY.md)
