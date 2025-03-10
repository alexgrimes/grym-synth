# VS Code Testing Guide

## Keyboard Shortcuts

### Running Tests
- `Ctrl+Shift+T` - Run all tests
- `Ctrl+Shift+E` - Run error handling tests
- `Ctrl+Shift+W` - Watch error handling tests
- `Ctrl+Shift+I` - Run infrastructure tests
- `Ctrl+Shift+C` - View coverage
- `Ctrl+Shift+R` - Generate report

### Current File Operations
- `Ctrl+K Ctrl+T` - Run current test file
- `Ctrl+K Ctrl+W` - Watch current test file
- `Ctrl+K Ctrl+D` - Debug current test file
- `Ctrl+K Ctrl+C` - Show coverage for current file

## Tasks

Access via Command Palette (`Ctrl+Shift+P`) -> "Tasks: Run Task"

### Test Running
- `Test: Run All` - Run all test suites
- `Test: Error Handling` - Run error tests
- `Test: Error Handling (Watch)` - Run error tests in watch mode
- `Test: Infrastructure` - Run infrastructure tests
- `Test: Infrastructure (Watch)` - Run infrastructure tests in watch mode
- `Test: Coverage` - Run tests with coverage
- `Test: Generate Report` - Generate HTML test report

### Setup and Maintenance
- `Test: Setup Environment` - Initialize test environment
- `Test: Clean Coverage` - Remove coverage reports

## Test Explorer

Access via Activity Bar -> Testing icon

### Features
- View all tests hierarchically
- Run/debug individual tests
- View test output inline
- Filter tests by status
- View code coverage inline

### Actions
- `Run Test` - Run single test
- `Debug Test` - Debug single test
- `Show Coverage` - Toggle coverage highlighting
- `Go to Test` - Jump to test definition
- `Add Test` - Create new test file

## Debug Features

### Launch Configurations
- "Debug Error Tests"
- "Debug Current Test"
- "Debug Test Runner"

### Debug Actions
- Set breakpoints in test code
- Step through test execution
- Inspect variables and state
- View call stack
- Add watch expressions

## Extensions

### Required
- Jest (`orta.vscode-jest`)
- Test Explorer UI (`hbenl.vscode-test-explorer`)
- Coverage Gutters (`ryanluker.vscode-coverage-gutters`)

### Recommended
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- GitLens (`eamodio.gitlens`)
- Todo Tree (`gruntfuggly.todo-tree`)

## Test Output

### Locations
- Coverage reports: `coverage/`
- Test output: `src/lib/testing/test-output.json`
- HTML report: `src/lib/testing/test-report.html`

### Views
1. Terminal output
   - Real-time test execution
   - Error messages
   - Coverage summary

2. Problems panel
   - Test failures
   - Linting issues
   - Type errors

3. Debug console
   - Test debugging output
   - Console logs
   - Error stack traces

## Tips and Tricks

### 1. Quick Test Running
```typescript
// Run single test
it.only('test name', () => {});

// Skip test
it.skip('test name', () => {});
```

### 2. Debug Helpers
```typescript
// Add debug point
debugger;

// Log test state
console.log('Test state:', context.getState());
```

### 3. Coverage Helpers
```typescript
// Force coverage collection
/* istanbul ignore next */
if (process.env.NODE_ENV === 'test') {
  // Test-only code
}
```

### 4. Watch Mode Filters
- Press `p` to filter by filename
- Press `t` to filter by test name
- Press `q` to quit watch mode

### 5. Test Organization
- Group related tests in describes
- Use consistent naming
- Keep test files next to implementation

## Common Issues

### 1. Tests Not Running
- Check file naming (*.test.ts)
- Verify Jest configuration
- Clear Jest cache: `npx jest --clearCache`

### 2. Coverage Not Showing
1. Run tests with coverage
2. Install Coverage Gutters extension
3. Toggle coverage display

### 3. Debugging Not Working
1. Check launch configuration
2. Ensure sourcemaps are enabled
3. Try clearing VS Code debug cache

## Getting Help

1. Check documentation:
   - TEST-HELP.md
   - TROUBLESHOOTING.md
   
2. Use VS Code features:
   - Command Palette help
   - Extension documentation
   - IntelliSense suggestions

3. Run diagnostics:
   ```bash
   npm run test:error -- --debug