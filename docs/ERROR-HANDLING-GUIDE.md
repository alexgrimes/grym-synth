# Error Handling Guide

## Overview

The grym-synth uses a standardized error handling system based on the Adapter pattern to ensure consistent, secure, and maintainable error management across the application.

## Quick Links

### Documentation
- [Error Patterns](ERROR-PATTERNS.md) - Common patterns and examples
- [Integration Checklist](ERROR-INTEGRATION-CHECKLIST.md) - Testing requirements
- [Error Status](ERROR-HANDLING-STATUS.md) - Implementation status

### Code
- `src/adapters/error-adapter/` - Error adapter implementation
- `src/types/errors.ts` - Error type definitions
- `src/lib/error-handler.ts` - Error handling utilities

## Core Concepts

### 1. Error Standardization
```typescript
// Convert any error to MCP error
const mcpError = ErrorAdapter.toMcpError(error);
```

### 2. Error Context
```typescript
// Preserve error context
throw ErrorAdapter.toMcpError(error, {
  operation: 'ResourceAllocation',
  details: { resourceId, requestType }
});
```

### 3. Error Response
```typescript
{
  "error": {
    "code": 400,
    "message": "Invalid input",
    "details": { ... }
  }
}
```

## Implementation Guides

### Controller Layer
```typescript
async function handleRequest(req: Request, res: Response) {
  try {
    const result = await service.process(req.body);
    res.json(result);
  } catch (error) {
    const mcpError = ErrorAdapter.toMcpError(error);
    res.status(mcpError.code).json({
      error: mcpError.message,
      code: mcpError.code
    });
  }
}
```

### Service Layer
```typescript
class ResourceService {
  async process(data: any) {
    try {
      await this.validate(data);
      return await this.execute(data);
    } catch (error) {
      throw ErrorAdapter.toMcpError(error, {
        service: 'ResourceService'
      });
    }
  }
}
```

## Testing Requirements

### Unit Tests
- Error mapping
- Context preservation
- Security checks
- Recovery logic

### Integration Tests
- End-to-end flows
- Error propagation
- Response format
- Status codes

## Best Practices

### 1. Error Handling
- Always use ErrorAdapter
- Preserve context
- Add relevant details
- Consider security

### 2. Error Messages
- Clear and concise
- No sensitive data
- Include error codes
- Structured format

### 3. Testing
- Cover all paths
- Test edge cases
- Verify context
- Check security

### 4. Documentation
- Document patterns
- Provide examples
- Explain recovery
- Update guides

## Common Patterns

### Resource Errors
```typescript
// Not Found
throw new NotFoundError('Resource not found');

// Service Unavailable
throw new ServiceUnavailableError('Pool exhausted');

// Validation Error
throw new ValidationError('Invalid input');
```

### Recovery Patterns
```typescript
// Retry Pattern
async function withRetry(operation) {
  try {
    return await operation();
  } catch (error) {
    if (isRetryable(error)) {
      return retry(operation);
    }
    throw ErrorAdapter.toMcpError(error);
  }
}
```

## Security Considerations

### 1. Error Sanitization
- Remove sensitive data
- Sanitize messages
- Control stack traces
- Secure logging

### 2. Access Control
- Error visibility
- Log access
- Audit trails
- Alert thresholds

## Monitoring

### 1. Error Logging
```typescript
// Structured logging
logger.error({
  code: mcpError.code,
  message: mcpError.message,
  context: mcpError.context,
  timestamp: new Date()
});
```

### 2. Metrics
- Error rates
- Error types
- Recovery rates
- Response times

## Next Steps

### Immediate
1. Complete integration tests
2. Update documentation
3. Team training
4. Basic monitoring

### Future
1. Advanced monitoring
2. Pattern analysis
3. Auto-recovery
4. Performance optimization

## Support

### Resources
- Documentation in `/docs`
- Examples in codebase
- Test suite
- Error patterns

### Team
- Integration: [Team Lead]
- Documentation: [Tech Writer]
- Testing: [QA Lead]
- DevOps: [DevOps Lead]

## Remember
1. Consistency is key
2. Security first
3. Document clearly
4. Test thoroughly
5. Monitor actively

---

This guide is a living document. As we learn more about our error handling needs and patterns, we'll continue to update and improve it.

