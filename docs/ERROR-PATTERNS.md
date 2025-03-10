# Error Handling Patterns Guide

## Quick Reference

### Basic Error Handling
```typescript
try {
  await operation();
} catch (error) {
  throw ErrorAdapter.toMcpError(error);
}
```

### With Context
```typescript
try {
  await operation();
} catch (error) {
  throw ErrorAdapter.toMcpError(error, {
    operation: 'ResourceAllocation',
    context: { resourceType, requestId }
  });
}
```

## Common Patterns

### 1. Controller Layer
```typescript
@Controller('/resources')
class ResourceController {
  async handleRequest(req: Request, res: Response) {
    try {
      const result = await this.service.process(req.body);
      res.json(result);
    } catch (error) {
      const mcpError = ErrorAdapter.toMcpError(error);
      res.status(mcpError.code).json({
        error: mcpError.message,
        code: mcpError.code
      });
    }
  }
}
```

### 2. Service Layer
```typescript
class ResourceService {
  async process(data: any) {
    try {
      await this.validate(data);
      return await this.execute(data);
    } catch (error) {
      // Add service context
      throw ErrorAdapter.toMcpError(error, {
        service: 'ResourceService',
        operation: 'process'
      });
    }
  }
}
```

### 3. Data Layer
```typescript
class ResourceRepository {
  async find(id: string) {
    try {
      const result = await this.db.findOne(id);
      if (!result) {
        throw new NotFoundError(`Resource ${id} not found`);
      }
      return result;
    } catch (error) {
      throw ErrorAdapter.toMcpError(error, {
        repository: 'ResourceRepository',
        operation: 'find',
        resourceId: id
      });
    }
  }
}
```

## Error Types

### 1. Resource Errors
```typescript
// Not Found
throw new NotFoundError('Resource not found');

// Stale Resource
throw new ResourceError(404, 'Resource expired');

// Resource Busy
throw new ResourceError(409, 'Resource locked');
```

### 2. Validation Errors
```typescript
// Basic Validation
throw new ValidationError('Invalid input');

// With Details
throw new ValidationError('Invalid configuration', {
  field: 'memory',
  min: 1024,
  provided: 512
});
```

### 3. Service Errors
```typescript
// Service Unavailable
throw new ServiceUnavailableError('Service down');

// Timeout
throw new ServiceUnavailableError('Operation timed out');

// Capacity
throw new ServiceUnavailableError('Service at capacity');
```

## Recovery Patterns

### 1. Retry Pattern
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (maxRetries > 0 && isRetryable(error)) {
      await delay(1000);
      return withRetry(operation, maxRetries - 1);
    }
    throw ErrorAdapter.toMcpError(error);
  }
}
```

### 2. Circuit Breaker
```typescript
class ResourceCircuitBreaker {
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new ServiceUnavailableError('Circuit breaker open');
    }
    try {
      return await operation();
    } catch (error) {
      this.recordFailure();
      throw ErrorAdapter.toMcpError(error);
    }
  }
}
```

## Error Response Format

### Standard Format
```json
{
  "error": {
    "code": 400,
    "message": "Invalid input parameters",
    "details": {
      "field": "size",
      "reason": "must be positive"
    }
  }
}
```

## Best Practices

### 1. Error Context
- Always include operation name
- Add relevant IDs
- Include timestamp
- Preserve stack traces in dev

### 2. Error Messages
- Be specific but secure
- Include error codes
- Structure details
- Use consistent format

### 3. Recovery
- Consider retry logic
- Implement timeouts
- Add circuit breakers
- Log recovery attempts

### 4. Security
- Sanitize errors
- Protect sensitive data
- Log securely
- Control access

## Testing Patterns

### 1. Unit Tests
```typescript
test('handles validation error', () => {
  const error = new ValidationError('Invalid input');
  const mcpError = ErrorAdapter.toMcpError(error);
  expect(mcpError.code).toBe(400);
});
```

### 2. Integration Tests
```typescript
test('handles service errors', async () => {
  const response = await request(app)
    .post('/resources')
    .send(invalidData);
  
  expect(response.status).toBe(400);
  expect(response.body.error).toBeDefined();
});
```

## Remember
1. Always use ErrorAdapter
2. Include context
3. Consider security
4. Test thoroughly
5. Document patterns
