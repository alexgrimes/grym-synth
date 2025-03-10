# TDR-002: Error Recovery System

## Context

The chat system needs robust error handling with both frontend feedback and backend recovery strategies. While we have a basic ErrorHandler implementation, it lacks user-facing feedback during recovery attempts.

## Current Implementation

### Backend Recovery (ErrorHandler)
- Implements retry logic with exponential backoff
- Handles recoverable errors (network, HTTP, Ollama-specific)
- Configurable retry attempts and timeouts
- Located in `src/lib/error-handler.ts`

```typescript
class ErrorHandler {
  private config = {
    maxRetries: 3,
    timeout: 300000,
    backoffFactor: 1.5
  };

  async withRecovery<T>(operation: () => Promise<T>): Promise<T> {
    // Implements retry logic with exponential backoff
  }
}
```

## Enhancement Decision

We will enhance the error recovery system by:

1. Adding UI feedback during recovery attempts
2. Integrating with the existing toast notification system
3. Providing clear status updates during retry operations

### Architecture Changes

1. **Recovery Status Interface**
```typescript
interface RecoveryStatus {
  isRetrying: boolean;
  attempt: number;
  maxAttempts: number;
  message: string;
  error?: Error;
}
```

2. **Enhanced Error Handler**
```typescript
class ErrorHandler {
  async withRecovery<T>(
    operation: () => Promise<T>,
    onStatusUpdate?: (status: RecoveryStatus) => void
  ): Promise<T> {
    // Existing retry logic with status updates
  }
}
```

3. **UI Integration in ChatPanel**
```typescript
function ChatPanel() {
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus | null>(null);

  async function handleSubmit() {
    try {
      // Normal operation
    } catch (error) {
      await errorHandler.withRecovery(
        async () => { /* operation */ },
        (status) => {
          setRecoveryStatus(status);
          // Show toast notification
        }
      );
    }
  }
}
```

## Benefits

1. **Better User Experience**
   - Users see what's happening during errors
   - Clear feedback during recovery attempts
   - Reduced frustration during retries

2. **Improved Error Handling**
   - Centralized error recovery logic
   - Consistent error handling across the application
   - Configurable retry strategies

3. **Maintainability**
   - Clear separation of concerns
   - Easy to modify recovery strategies
   - Reusable across different components

## Alternatives Considered

1. **Client-side Only Recovery**
   - Pros: Simpler implementation
   - Cons: Less robust, no server-side recovery options
   - Decision: Rejected in favor of full-stack approach

2. **Global Error Boundary**
   - Pros: Catches all React errors
   - Cons: Too broad, less contextual recovery
   - Decision: Using targeted error handling instead

## Implementation Notes

1. The ErrorHandler remains the core recovery mechanism
2. UI components subscribe to recovery status updates
3. Toast notifications provide non-intrusive feedback
4. Recovery strategies are configurable per error type

## Future Considerations

1. Add more sophisticated recovery strategies
2. Implement error reporting/analytics
3. Add user-configurable retry options
4. Consider circuit breaker pattern for persistent failures

## References

- [Error Handler Implementation](../src/lib/error-handler.ts)
- [Chat Panel Component](../src/components/chat-panel.tsx)
- [Toast Notification System](../src/lib/toast-service.ts)
