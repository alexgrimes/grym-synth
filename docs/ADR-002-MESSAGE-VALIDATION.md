# ADR 002: Message Validation Architecture

## Status
Proposed

## Context
Our message validation is currently spread across multiple methods and has several issues:
1. Duplicate validation logic in `validateMessage()` and `addMessage()`
2. Inconsistent error handling
3. Weak type safety
4. Missing validation for critical fields

This is particularly important for our grym-synth because:
- Invalid messages could corrupt learning context
- Audio processing requires strict data validation
- Resource management depends on accurate message sizing

## Decision

We will:

1. **Consolidate Validation Logic**
   ```typescript
   class ContextManager {
     private validateMessage(message: unknown): asserts message is Message {
       // Type guard validation
       if (!message || typeof message !== 'object') {
         throw new ResourceError('INVALID_MESSAGE', 'Message must be a valid object');
       }

       // Content validation
       if (!('content' in message) || typeof message.content !== 'string') {
         throw new ResourceError('INVALID_MESSAGE', 'Message content must be a string');
       }

       // Role validation
       if (!('role' in message) || !['user', 'assistant', 'system'].includes(message.role)) {
         throw new ResourceError('INVALID_MESSAGE', 'Invalid message role');
       }

       // Size validation
       if (message.content.length > MAX_MESSAGE_SIZE) {
         throw new ResourceError('RESOURCE_EXHAUSTED', 'Message size exceeds limit');
       }
     }
   }
   ```

2. **Improve Type Safety**
   ```typescript
   interface Message {
     content: string;
     role: 'user' | 'assistant' | 'system';
     timestamp: number;
   }

   type ValidationResult = {
     isValid: boolean;
     error?: ResourceError;
   };
   ```

3. **Standardize Error Types**
   ```typescript
   enum ValidationErrorType {
     INVALID_MESSAGE = 'INVALID_MESSAGE',
     RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED'
   }

   const ValidationErrors = {
     [ValidationErrorType.INVALID_MESSAGE]: {
       empty: 'Message content cannot be empty',
       type: 'Message content must be a string',
       role: 'Invalid message role'
     },
     [ValidationErrorType.RESOURCE_EXHAUSTED]: {
       size: 'Message size exceeds limit'
     }
   };
   ```

## Consequences

### Positive
1. **Better Type Safety**
   - Compile-time type checking
   - Runtime type validation
   - Clear type boundaries

2. **Consistent Error Handling**
   - Standard error types
   - Clear error messages
   - Predictable behavior

3. **Improved Maintainability**
   - Single source of truth
   - Easy to update validation rules
   - Clear validation flow

4. **Better Testing**
   - Focused test cases
   - Clear validation boundaries
   - Easy to mock and verify

### Negative
1. **Initial Development Overhead**
   - Need to refactor existing code
   - More boilerplate for validation
   - Additional test coverage needed

2. **Slightly More Complex Code**
   - Type assertions required
   - More structured error handling
   - Additional validation layers

## Implementation Strategy

1. **Phase 1: Core Validation**
   - Implement type guards
   - Add basic validation
   - Write core tests

2. **Phase 2: Error Handling**
   - Standardize error types
   - Improve error messages
   - Add error tests

3. **Phase 3: Integration**
   - Update message processing
   - Add size validation
   - Test edge cases

## Success Metrics

1. **Code Quality**
   - No type errors
   - Clear validation flow
   - High test coverage

2. **Runtime Safety**
   - No invalid messages
   - Proper error handling
   - Resource protection

3. **Developer Experience**
   - Clear validation rules
   - Helpful error messages
   - Easy to maintain

## References

- [Message Validation Test Plan](./MESSAGE-VALIDATION-TEST-PLAN.md)
- [Error Handling Test Plan](./ERROR-HANDLING-TEST-PLAN.md)
- [Resource Management Guide](./RESOURCE-MANAGEMENT-GUIDE.md)

