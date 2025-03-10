# Test Infrastructure Guide

## Quick Start

```bash
# Run all tests
npm run test:all

# Run error handling tests
npm run test:error

# Run infrastructure tests
npm run test:infra     # Unix/Mac
npm run test:infra:win # Windows
```

## Test Categories

### 1. Error Handling Tests
Tests error handling across the system:
```bash
npm run test:error           # Run tests
npm run test:error:watch     # Watch mode
npm run test:error:coverage  # With coverage
```

### 2. Infrastructure Tests
Tests the test infrastructure itself:
```bash
npm run test:infra           # Run tests
npm run test:infra:watch     # Watch mode
```

### 3. Report Generation
Generate HTML test reports:
```bash
npm run test:error -- report  # Generate error handling report
```

## Test Scripts

### Unix/Mac
```bash
# Run from project root
./src/lib/testing/run-infra-tests.sh        # Run infrastructure tests
./src/lib/testing/run-infra-tests.sh --watch # Watch mode
```

### Windows
```batch
# Run from project root
src\lib\testing\run-infra-tests.bat        # Run infrastructure tests
src\lib\testing\run-infra-tests.bat --watch # Watch mode
```

## Coverage Reports

Coverage reports are generated in:
- `coverage/test-infrastructure/` - Infrastructure tests
- `coverage/error-handling/` - Error handling tests

HTML reports are available at:
- `coverage/test-infrastructure/lcov-report/index.html`
- `coverage/error-handling/lcov-report/index.html`

## Test Structure

### Error Handling Tests
```typescript
describe('Error Handling', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await TestContext.create();
  });

  it('handles errors', async () => {
    const error = ErrorTestUtils.createResourceError('exhausted');
    await context.mockError(error);
    expect(context.getState().health).toBe('warning');
  });
});
```

### Infrastructure Tests
```typescript
describe('Test Infrastructure', () => {
  it('generates reports', async () => {
    const result = await tasks.report();
    expect(result.success).toBe(true);
    expect(result.output).toContain('Report saved');
  });
});
```

## Debugging Tests

### VS Code Launch Configurations
Use the provided launch configurations:
1. "Debug Error Tests"
2. "Debug Current Test"
3. "Debug Test Runner"

### Command Line Debugging
```bash
# Unix/Mac
NODE_OPTIONS="--inspect-brk" npm run test:error

# Windows
set NODE_OPTIONS=--inspect-brk
npm run test:error
```

## Common Issues

### 1. State Leaks
Make sure to reset state between tests:
```typescript
afterEach(async () => {
  await context.reset();
});
```

### 2. Async Issues
Use proper async/await:
```typescript
// Wrong
context.mockError(error);

// Right
await context.mockError(error);
```

### 3. File Cleanup
Clean up test files:
```typescript
afterEach(() => {
  if (existsSync(testFile)) {
    unlinkSync(testFile);
  }
});
```

## Test Coverage Requirements

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90
  }
}
```

## Adding New Tests

1. Create test file in `__tests__` directory
2. Import test utilities:
   ```typescript
   import { TestContext } from '../test-context';
   import { ErrorTestUtils } from '../error-test-utils';
   ```
3. Use provided test context and utilities
4. Run tests to verify

## CI/CD Integration

Tests are run in CI with:
```bash
npm run test:all
```

Coverage reports are uploaded to:
- Error handling: `artifacts/coverage/error-handling/`
- Infrastructure: `artifacts/coverage/test-infrastructure/`

## Getting Help

1. Check this guide
2. Review test examples in `__tests__/`
3. See `TROUBLESHOOTING.md` for common issues
4. Run tests with `--verbose` for more details
