# Contributing to grym-synth

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/alexgrimes/grym-synth.git
cd grym-synth
```

2. Install dependencies:
```bash
npm install
```

3. Run tests:
```bash
npm test
```

## Code Structure

### Core Components
- `src/lib/feature-memory/` - Memory management system
- `src/services/audio/` - Audio processing services
- `tests/integration/` - Integration tests
- `docs/` - Documentation

### Testing
- Unit tests alongside source files
- Integration tests in `tests/integration/`
- Performance tests in feature-memory tests
- Coverage requirements: 80% minimum

### Documentation
- Keep docs up-to-date with code changes
- Follow JSDoc for code documentation
- Update README.md for major changes

## Pull Request Process

1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following style guidelines

3. Run tests and ensure coverage:
```bash
npm test
```

4. Push your branch and create a PR:
```bash
git push origin feature/your-feature-name
```

5. Update documentation as needed

## Code Quality Guidelines

- Follow TypeScript best practices
- Maintain test coverage above 80%
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

## Commit Guidelines

Format: `type(scope): description`

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- test: Tests
- perf: Performance improvement
- refactor: Code refactoring

Example:
```
feat(memory): add garbage collection triggers
```

## Need Help?

- Check existing documentation
- Open an issue for questions
- Tag maintainers for urgent matters

