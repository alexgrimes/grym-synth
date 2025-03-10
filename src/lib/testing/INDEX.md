# Test Documentation Index

## Quick Start
- [Test Help Guide](TEST-HELP.md) - Complete testing guide
- [VS Code Guide](VSCODE-GUIDE.md) - VS Code integration and shortcuts
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

## Running Tests

### Basic Commands
```bash
# Run all tests
npm run test:all

# Run error handling tests
npm run test:error
npm run test:error:watch
npm run test:error:coverage

# Run infrastructure tests
npm run test:infra
npm run test:infra:watch
```

### Test Reports
```bash
# Generate HTML report
npm run test:error -- report
```

## Documentation Structure

### 1. Main Guides
- [Test Help](TEST-HELP.md)
  - Test infrastructure overview
  - Running tests
  - Writing tests
  - Coverage requirements

- [VS Code Integration](VSCODE-GUIDE.md)
  - Keyboard shortcuts
  - Tasks and commands
  - Debugging
  - Extensions

- [Contributing](CONTRIBUTING.md)
  - Development workflow
  - Code style
  - Pull request process
  - Best practices

- [Troubleshooting](TROUBLESHOOTING.md)
  - Common issues
  - Solutions
  - Debug tips
  - FAQs

### 2. Test Infrastructure

#### Core Components
- [Error Test Utils](error-test-utils.ts)
  - Error creation
  - Error verification
  - Test helpers

- [Test Context](test-context.ts)
  - Test state management
  - Resource pool mocking
  - Health monitoring

#### Test Runners
- [Test Tasks](test-tasks.ts)
  - Task definitions
  - Command runners
  - Report generation

- [Report Generator](generate-report.ts)
  - HTML reports
  - Coverage analysis
  - Test summaries

### 3. Configuration

#### VS Code Settings
- [Launch Config](.vscode/launch.json)
- [Tasks](.vscode/tasks.json)
- [Extensions](.vscode/extensions.json)
- [Keybindings](.vscode/keybindings.json)

#### Test Configuration
- [Jest Config](jest.config.js)
- [TypeScript Config](tsconfig.json)
- [Test TypeScript Config](tsconfig.test.json)

### 4. CI/CD Integration
- [GitHub Workflow](.github/workflows/test.yml)
  - Test execution
  - Coverage reporting
  - Artifact publishing

## Test Categories

### 1. Error Handling Tests
- Resource pool errors
- Health state transitions
- Error recovery
- System state management

### 2. Infrastructure Tests
- Test utilities
- Report generation
- Coverage tracking
- CI/CD integration

## Directory Structure
```
src/lib/testing/
├── __tests__/               # Test files
├── setup/                   # Test setup
├── matchers/               # Custom matchers
├── utils/                  # Test utilities
├── *.ts                   # Core files
└── *.md                   # Documentation
```

## Getting Help

1. Check documentation:
   - Start with [TEST-HELP.md](TEST-HELP.md)
   - See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for issues
   - Review [VSCODE-GUIDE.md](VSCODE-GUIDE.md) for IDE help

2. Run diagnostics:
   ```bash
   # Setup check
   npx ts-node setup-test-env.ts --verify

   # Run tests with debug output
   npm run test:error -- --debug
   ```

3. View reports:
   ```bash
   # Generate and open report
   npm run test:error -- report
   open test-report.html
   ```

## Contributing

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Set up environment:
   ```bash
   npx ts-node setup-test-env.ts
   ```
3. Create feature branch
4. Make changes
5. Run tests:
   ```bash
   npm run test:all
   ```
6. Submit pull request

## License

Same as main project