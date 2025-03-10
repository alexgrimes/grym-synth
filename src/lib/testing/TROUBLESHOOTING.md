# Error Handling Test Troubleshooting

## Common Issues and Solutions

### 1. Test Setup Issues

#### State Not Resetting
```typescript
// Problem:
test('fails due to state leak', async () => {
  await context.mockError(error);  // Previous state remains
});

// Solution:
beforeEach(async () => {
  context = await TestContext.create();  // Fresh context
});

afterEach(async () => {
  await context.reset();  // Clean up
});
```

#### Async Timing Issues
```typescript
// Problem:
await context.mockError(error);
expect(context.getState().health).toBe('error');  // Too early

// Solution:
await context.mockError(error);
await new Promise(resolve => setTimeout(resolve, 0));  // Let state update
expect(context.getState().health).toBe('error');
```

### 2. Error Handling Issues

#### Uncaught Promise Rejections
```typescript
// Problem:
context.mockError(error);  // Missing await

// Solution:
await expect(context.mockError(error)).resolves.not.toThrow();
```

#### Wrong Error Types
```typescript
// Problem:
const error = new Error('Pool exhausted');  // Generic error

// Solution:
const error = ErrorTestUtils.createResourceError('exhausted');  // Typed error
```

### 3. State Verification Issues

#### Incomplete State Checks
```typescript
// Problem:
expect(state.health).toBe('warning');  // Partial check

// Solution:
const state = context.getState();
expect(state.health).toBe('warning');
expect(state.errorCount).toBe(1);
expect(state.metrics.lastError).toBeTruthy();
```

#### Resource Leaks
```typescript
// Problem:
test('leaks resources', async () => {
  await context.resourcePool.mockAllocation('success');
  // No cleanup
});

// Solution:
afterEach(async () => {
  await context.reset();  // Reset pool state
});
```

### 4. Coverage Issues

#### Missing Edge Cases
```typescript
// Add these test cases:
test('handles null errors', async () => {
  await expect(
    context.mockError(null)
  ).rejects.toThrow('Invalid error');
});

test('handles undefined context', async () => {
  const error = ErrorTestUtils.createResourceError('exhausted');
  await expect(
    context.mockError(error, undefined)
  ).resolves.not.toThrow();
});
```

#### Async Coverage
```typescript
// Problem:
promise.catch(error => handleError(error));  // Unhandled

// Solution:
await expect(promise).rejects.toThrow();
// or
await promise.catch(error => {
  expect(error).toBeDefined();
});
```

## Debug Techniques

### 1. State Inspection
```typescript
test('debug state changes', async () => {
  console.log('Initial:', context.getState());
  await context.mockError(error);
  console.log('After error:', context.getState());
  await context.reset();
  console.log('After reset:', context.getState());
});
```

### 2. Error Context
```typescript
test('debug error details', async () => {
  const error = ErrorTestUtils.createResourceError('exhausted');
  console.log('Error:', {
    name: error.name,
    message: error.message,
    code: error['code'],
    context: error['context']
  });
});
```

### 3. Async Flow
```typescript
test('debug async operations', async () => {
  console.time('operation');
  await context.mockError(error);
  console.timeEnd('operation');
  
  console.time('state-update');
  const state = context.getState();
  console.timeEnd('state-update');
});
```

## Running Tests in Debug Mode

### VS Code Launch Config
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Error Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--testMatch",
    "**/error-handling.test.ts"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Jest Debug Config
```javascript
// jest.config.js
module.exports = {
  verbose: true,
  testTimeout: 30000,
  detectOpenHandles: true,
  forceExit: true
};
```

## Getting Help

1. Check test output for error details
2. Review state changes with console.log
3. Use debugger for step-by-step inspection
4. Run tests in isolation
5. Verify test environment setup