# Simplified Error Handling Approach

## Current Issues

The current error handling tests are:
1. Testing too many things at once
2. Creating side effects
3. Having unclear expectations

## Simplified Approach

### 1. Circuit Breaker Test

Current problematic test:
```typescript
it('should implement circuit breaker with failure window', async () => {
  // Tests too many things
  // Has side effects
  // Unclear error expectations
});
```

Simplified version:
```typescript
describe('Circuit Breaker', () => {
  it('should limit repeated failures', async () => {
    const contextManager = new ContextManager();
    let attempts = 0;
    
    // Simple mock that just counts attempts
    jest.spyOn(contextManager as any, 'calculateTokenCount')
      .mockImplementation(() => {
        attempts++;
        throw new Error('Test failure');
      });

    // Try a few times
    for (let i = 0; i < 6; i++) {
      try {
        await contextManager.addMessage('test', createTestMessage('test'));
      } catch (error) {
        // Expected to fail
      }
    }
    
    expect(attempts).toBeLessThan(5); // Should stop before max attempts
  });
});
```

Key improvements:
- Tests one thing: failure limiting
- Clear expectations
- No side effects
- Easy to understand

### 2. Message Validation

Split into focused tests:
```typescript
describe('Message Validation', () => {
  it('should reject empty messages', async () => {
    const contextManager = new ContextManager();
    await expect(
      contextManager.addMessage('test', { content: '', role: 'user' })
    ).rejects.toThrow('Message content cannot be empty');
  });

  it('should reject undefined messages', async () => {
    const contextManager = new ContextManager();
    await expect(
      contextManager.addMessage('test', undefined)
    ).rejects.toThrow('Message content cannot be empty');
  });
});
```

### 3. Context Cleanup

Focus on basic cleanup:
```typescript
describe('Context Cleanup', () => {
  it('should remove context when requested', async () => {
    const contextManager = new ContextManager();
    await contextManager.initializeContext('test', testModelConstraints);
    await contextManager.cleanup('test');
    
    const context = await contextManager.getContext('test');
    expect(context).toBeUndefined();
  });
});
```

## Implementation Steps

1. Start with circuit breaker:
   - Implement basic failure counting
   - Add simple threshold check
   - Test failure limiting only

2. Add message validation:
   - Basic content checks
   - Type validation
   - Clear error messages

3. Implement context cleanup:
   - Simple removal
   - Resource cleanup
   - Event cleanup

## Testing Guidelines

1. One Assertion Per Test
   - Each test should verify one specific behavior
   - Clear failure messages
   - No side effects

2. Clear Setup
   - Minimal test configuration
   - Clear mock behavior
   - Documented expectations

3. Proper Cleanup
   - Reset state between tests
   - Clear mocks
   - Remove test data

## Next Steps

1. Replace the complex circuit breaker test with the simplified version
2. Verify basic failure limiting works
3. Add message validation tests
4. Implement context cleanup tests

The goal is to get the basic functionality working reliably before adding more complex features or optimizations.

## Success Criteria

1. All simplified tests pass consistently
2. Clear error messages
3. No test interdependencies
4. Easy to understand test failures

## References

- Original error handling test: error-handling.test.ts
- Circuit breaker implementation: context-manager.ts
- Test helpers: test-helpers.ts
