# Contributing to Test Infrastructure

This guide helps you contribute to our test infrastructure effectively.

## Quick Start

```bash
# Set up test environment
npx ts-node setup-test-env.ts

# Run all tests
npm run test:all
```

## Development Workflow

1. Create feature branch
   ```bash
   git checkout -b feature/improve-error-tests
   ```

2. Set up environment
   ```bash
   npx ts-node setup-test-env.ts
   ```

3. Run tests in watch mode
   ```bash
   npm run test:error:watch
   ```

4. Make changes and ensure tests pass
   ```bash
   npm run test:all
   ```

## Test Structure

### 1. Error Handling Tests
Place in `__tests__/error-*.test.ts`:
```typescript
import { TestContext } from '../test-context';
import { ErrorTestUtils } from '../error-test-utils';

describe('Error Feature', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await TestContext.create();
  });

  afterEach(async () => {
    await context.reset();
  });

  it('handles specific error', async () => {
    const error = ErrorTestUtils.createResourceError('exhausted');
    await context.mockError(error);
    expect(context.getState().health).toBe('warning');
  });
});
```

### 2. Infrastructure Tests
Place in `__tests__/infra-*.test.ts`:
```typescript
describe('Infrastructure Feature', () => {
  it('performs expected action', async () => {
    const result = await performAction();
    expect(result).toBeTruthy();
  });
});
```

## Adding New Tests

1. Create test file:
   ```typescript
   // __tests__/error-feature.test.ts
   import { TestContext } from '../test-context';
   
   describe('Feature', () => {
     let context: TestContext;
     
     beforeEach(async () => {
       context = await TestContext.create();
     });
     
     it('works', async () => {
       // Test implementation
     });
   });
   ```

2. Add test utilities if needed:
   ```typescript
   // error-test-utils.ts
   export class ErrorTestUtils {
     static newHelper(): void {
       // Helper implementation
     }
   }
   ```

3. Update documentation
4. Run all tests
5. Check coverage

## Code Style

1. Use async/await consistently
   ```typescript
   // Good
   await context.mockError(error);
   
   // Bad
   context.mockError(error).then(() => {});
   ```

2. Reset state after tests
   ```typescript
   afterEach(async () => {
     await context.reset();
   });
   ```

3. Use type-safe assertions
   ```typescript
   // Good
   expect(result.status).toBe('success');
   
   // Bad
   expect(result.status == 'success').toBeTruthy();
   ```

## Coverage Requirements

Maintain high coverage:
- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

Check coverage:
```bash
npm run test:error:coverage
```

## Pull Request Checklist

1. Run all tests
   ```bash
   npm run test:all
   ```

2. Check coverage
   ```bash
   npm run test:error:coverage
   npm run test:infra:coverage
   ```

3. Update documentation if needed
   - TEST-HELP.md
   - TROUBLESHOOTING.md
   - README.md

4. Run linter
   ```bash
   npm run lint
   ```

5. Format code
   ```bash
   npm run format
   ```

## Common Issues

1. State Leaks
   ```typescript
   // Good
   afterEach(async () => {
     await context.reset();
   });
   ```

2. Async Errors
   ```typescript
   // Good
   await expect(async () => {
     await riskyOperation();
   }).rejects.toThrow();
   ```

3. Coverage Gaps
   ```typescript
   // Good
   if (condition) {
     await handleSuccess();
   } else {
     await handleError();
   }
   // Test both branches
   ```

## Getting Help

1. Check documentation:
   - TEST-HELP.md
   - TROUBLESHOOTING.md

2. Run tests with verbose output:
   ```bash
   npm run test:error -- --verbose
   ```

3. Check test report:
   ```bash
   npm run test:error -- report
   open test-report.html
   ```

## License

Same as main project