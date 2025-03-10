# Message Validation Test Plan

## Overview

After successfully implementing the circuit breaker functionality, we'll focus on message validation as the next critical component of our error handling system. Message validation ensures data integrity and prevents invalid states in our audio learning system.

## Current Issues

1. Duplicate validation logic between `validateMessage()` and `addMessage()`
2. Unclear error messages for validation failures
3. Inconsistent handling of edge cases
4. Missing validation for required fields

## Test Structure

### 1. Basic Content Validation

```typescript
describe('Message Content Validation', () => {
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

  it('should reject whitespace-only messages', async () => {
    const contextManager = new ContextManager();
    await expect(
      contextManager.addMessage('test', { content: '   ', role: 'user' })
    ).rejects.toThrow('Message content cannot be empty');
  });
});
```

### 2. Type Validation

```typescript
describe('Message Type Validation', () => {
  it('should validate message object structure', async () => {
    const contextManager = new ContextManager();
    await expect(
      contextManager.addMessage('test', { content: 123 } as any)
    ).rejects.toThrow('Message content must be a string');
  });

  it('should validate role field', async () => {
    const contextManager = new ContextManager();
    await expect(
      contextManager.addMessage('test', { content: 'test', role: 'invalid' } as any)
    ).rejects.toThrow('Invalid message role');
  });
});
```

### 3. Size Limits

```typescript
describe('Message Size Validation', () => {
  it('should reject messages exceeding size limit', async () => {
    const contextManager = new ContextManager();
    const largeContent = 'x'.repeat(10000);
    await expect(
      contextManager.addMessage('test', { content: largeContent, role: 'user' })
    ).rejects.toThrow('Message size exceeds limit');
  });
});
```

## Implementation Guidelines

1. **Consolidate Validation Logic**
   - Move all validation to `validateMessage()`
   - Use single source of truth for validation rules
   - Return specific error types for each validation failure

2. **Error Messages**
   - Clear, descriptive error messages
   - Include validation criteria in messages
   - Consistent error format

3. **Type Safety**
   - Use TypeScript type guards
   - Validate object structure
   - Check field types explicitly

4. **Performance**
   - Validate early to fail fast
   - Optimize string operations
   - Cache validation results where appropriate

## Test Implementation Steps

1. **Basic Setup**
   ```typescript
   beforeEach(() => {
     contextManager = new ContextManager();
   });

   afterEach(() => {
     contextManager.cleanup();
     jest.restoreAllMocks();
   });
   ```

2. **Helper Functions**
   ```typescript
   const createValidMessage = (content: string) => ({
     content,
     role: 'user',
     timestamp: Date.now()
   });

   const createInvalidMessage = (override: any) => ({
     ...createValidMessage('test'),
     ...override
   });
   ```

3. **Error Types**
   ```typescript
   enum ValidationErrorType {
     EMPTY_CONTENT = 'Message content cannot be empty',
     INVALID_TYPE = 'Message content must be a string',
     INVALID_ROLE = 'Invalid message role',
     SIZE_LIMIT = 'Message size exceeds limit'
   }
   ```

## Success Criteria

1. **Reliability**
   - All validation tests pass consistently
   - No false positives/negatives
   - Clear error messages

2. **Coverage**
   - All edge cases covered
   - Type validation complete
   - Size limits enforced

3. **Performance**
   - Fast validation checks
   - Efficient string operations
   - No unnecessary processing

## Next Steps

1. Implement basic content validation tests
2. Add type validation tests
3. Implement size limit tests
4. Refactor validation logic in ContextManager
5. Run full test suite

## Benefits

1. **Data Integrity**
   - Prevent invalid messages
   - Maintain consistent state
   - Clear validation rules

2. **Developer Experience**
   - Clear error messages
   - Predictable behavior
   - Easy to extend

3. **Maintenance**
   - Single validation source
   - Easy to update rules
   - Clear test coverage

## References

- [Circuit Breaker Implementation](./ERROR-HANDLING-FIXES.md)
- [Error Handling Test Plan](./ERROR-HANDLING-TEST-PLAN.md)
- [Resource Management Guide](./RESOURCE-MANAGEMENT-GUIDE.md)
