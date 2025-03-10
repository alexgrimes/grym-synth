# grym-synth - Developer Guide

## Table of Contents
- [Development Environment Setup](#development-environment-setup)
- [Code Organization](#code-organization)
- [Architecture Overview](#architecture-overview)
- [Testing Approach](#testing-approach)
- [Contributing Guidelines](#contributing-guidelines)

## Development Environment Setup

### Prerequisites

Before setting up the development environment, ensure you have the following installed:

- **Node.js** (v16.x or higher)
- **npm** (v7.x or higher) or **yarn** (v1.22.x or higher)
- **Git**
- **Docker** and **Docker Compose** (for containerized development)
- **Python** (v3.9 or higher, for ML components)

### Initial Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-organization/grym-synth.git
cd grym-synth
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit the `.env` file with your local configuration:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_TYPE=file
DB_PATH=./data

# Audio Processing
AUDIO_UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=100000000

# Feature Memory System
FEATURE_MEMORY_ENABLED=true
FEATURE_MEMORY_CACHE_SIZE=1000

# Authentication
JWT_SECRET=your_development_secret_key
JWT_EXPIRATION=3600
```

4. **Install Python dependencies (if working with ML components)**

```bash
cd python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running the Development Server

```bash
# Start the Next.js development server
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`.

### Docker Development Environment

For a containerized development environment:

```bash
# Build and start containers
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop containers
docker-compose -f docker-compose.dev.yml down
```

### Development Tools

- **ESLint**: `npm run lint` - Linting JavaScript/TypeScript files
- **Prettier**: `npm run format` - Code formatting
- **TypeScript**: `npm run type-check` - Type checking
- **Jest**: `npm run test` - Running tests
- **Storybook**: `npm run storybook` - UI component development

## Code Organization

The grym-synth follows a modular architecture with clear separation of concerns:

```
grym-synth/
├── app/                    # Next.js app directory
│   ├── api/                # API routes
│   ├── (routes)/           # Frontend routes
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # React components
│   ├── ui/                 # UI components
│   ├── audio/              # Audio-specific components
│   └── visualization/      # Data visualization components
├── lib/                    # Core libraries
│   ├── core/               # Core functionality
│   ├── feature-memory/     # Feature memory system
│   ├── audio-processing/   # Audio processing utilities
│   └── ml/                 # Machine learning integration
├── public/                 # Static assets
├── scripts/                # Utility scripts
├── tests/                  # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── types/                  # TypeScript type definitions
├── .env.example            # Example environment variables
├── .eslintrc.json          # ESLint configuration
├── jest.config.js          # Jest configuration
├── next.config.js          # Next.js configuration
├── package.json            # Project dependencies
├── tsconfig.json           # TypeScript configuration
└── docker-compose.yml      # Docker Compose configuration
```

### Key Directories and Files

- **app/**: Contains the Next.js application with API routes and frontend pages
- **components/**: Reusable React components organized by domain
- **lib/**: Core functionality and business logic
- **lib/feature-memory/**: The feature memory system for audio pattern learning
- **lib/audio-processing/**: Audio processing utilities and algorithms
- **lib/ml/**: Machine learning model integration and utilities

## Architecture Overview

### Frontend Architecture

The frontend is built with Next.js and follows a component-based architecture:

1. **Pages**: Defined in the `app/` directory, representing different routes
2. **Components**: Reusable UI elements in the `components/` directory
3. **Hooks**: Custom React hooks for shared logic
4. **Context**: React Context for state management across components

### Backend Architecture

The backend is implemented as API routes in Next.js, organized into:

1. **API Routes**: Defined in `app/api/` directory
2. **Service Layer**: Business logic in `lib/` directory
3. **Data Access Layer**: File system and data management utilities

### Feature Memory System

The Feature Memory System is a core component that:

1. Extracts features from audio files
2. Stores features in an optimized in-memory structure
3. Provides pattern matching and similarity search
4. Supports incremental learning from new audio samples

```
lib/feature-memory/
├── core/                   # Core memory system
│   ├── extractor.ts        # Feature extraction
│   ├── store.ts            # Memory storage
│   ├── matcher.ts          # Pattern matching
│   └── learner.ts          # Learning algorithms
├── health/                 # System health monitoring
├── adapters/               # Adapters for different audio sources
└── utils/                  # Utility functions
```

### Audio Processing Pipeline

The audio processing pipeline consists of:

1. **Upload**: Handling file uploads and validation
2. **Processing**: Audio normalization, filtering, and feature extraction
3. **Analysis**: Pattern recognition and feature comparison
4. **Visualization**: Generating visual representations of audio data

## Testing Approach

The grym-synth uses a comprehensive testing strategy:

### Unit Tests

Unit tests focus on testing individual functions and components in isolation:

```bash
# Run all unit tests
npm run test:unit

# Run specific unit tests
npm run test:unit -- --testPathPattern=feature-memory
```

Example unit test for a feature extractor:

```typescript
// tests/unit/feature-memory/extractor.test.ts
import { extractMFCC } from '../../../lib/feature-memory/core/extractor';

describe('MFCC Feature Extractor', () => {
  it('should extract the correct number of coefficients', () => {
    const audioData = new Float32Array(1024);
    // Fill with test data...

    const mfcc = extractMFCC(audioData, {
      sampleRate: 44100,
      numCoefficients: 13
    });

    expect(mfcc.length).toBe(13);
  });

  it('should handle empty audio data', () => {
    const audioData = new Float32Array(0);

    expect(() => {
      extractMFCC(audioData, {
        sampleRate: 44100,
        numCoefficients: 13
      });
    }).toThrow('Audio data cannot be empty');
  });
});
```

### Integration Tests

Integration tests verify that different parts of the system work together:

```bash
# Run all integration tests
npm run test:integration

# Run specific integration tests
npm run test:integration -- --testPathPattern=api
```

Example integration test for an API endpoint:

```typescript
// tests/integration/api/audio.test.ts
import { createServer } from 'http';
import { apiResolver } from 'next/dist/server/api-utils/node';
import handler from '../../../app/api/audio/route';
import { readFileSync } from 'fs';

describe('Audio API', () => {
  it('should upload an audio file successfully', async () => {
    const testFile = readFileSync('./tests/fixtures/test.wav');
    const formData = new FormData();
    formData.append('file', new Blob([testFile]), 'test.wav');

    const response = await fetch('/api/audio/upload', {
      method: 'POST',
      body: formData
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.name).toBe('test.wav');
  });
});
```

### End-to-End Tests

End-to-end tests simulate real user interactions:

```bash
# Run all E2E tests
npm run test:e2e
```

Example E2E test using Playwright:

```typescript
// tests/e2e/upload.test.ts
import { test, expect } from '@playwright/test';

test('should upload and process an audio file', async ({ page }) => {
  await page.goto('/');

  // Upload file
  await page.setInputFiles('input[type="file"]', './tests/fixtures/test.wav');
  await page.click('button[type="submit"]');

  // Wait for processing to complete
  await page.waitForSelector('.processing-complete');

  // Verify visualization is displayed
  expect(await page.isVisible('.waveform-visualization')).toBeTruthy();
  expect(await page.isVisible('.spectrogram-visualization')).toBeTruthy();
});
```

### Performance Tests

Performance tests ensure the system meets performance requirements:

```bash
# Run performance tests
npm run test:performance
```

Example performance test:

```typescript
// tests/performance/feature-memory.test.ts
import { FeatureMemorySystem } from '../../lib/feature-memory/core';
import { generateRandomAudio } from '../utils/test-helpers';

describe('Feature Memory Performance', () => {
  it('should handle 1000 audio samples within time limit', async () => {
    const memory = new FeatureMemorySystem();
    const samples = Array.from({ length: 1000 }, () =>
      generateRandomAudio(44100 * 5) // 5 seconds of audio
    );

    const startTime = performance.now();

    for (const sample of samples) {
      await memory.processAndStore(sample);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Processed 1000 samples in ${duration}ms`);
    expect(duration).toBeLessThan(60000); // Should complete in under 60 seconds
  });
});
```

## Contributing Guidelines

### Workflow

1. **Fork the repository** and create a new branch for your feature or bugfix
2. **Implement your changes** following the code style guidelines
3. **Write tests** for your changes
4. **Run the test suite** to ensure all tests pass
5. **Submit a pull request** with a clear description of the changes

### Code Style Guidelines

- Follow the ESLint and Prettier configurations
- Use TypeScript for type safety
- Write meaningful comments and documentation
- Follow the naming conventions:
  - PascalCase for components and classes
  - camelCase for variables and functions
  - UPPER_CASE for constants

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Changes to the build process or auxiliary tools

Example:
```
feat(audio-processing): add spectral flux feature extraction

Implement spectral flux calculation for better transient detection.
Includes unit tests and performance optimization.

Closes #123
```

### Pull Request Process

1. Update the README.md or documentation with details of changes if appropriate
2. Update the CHANGELOG.md following the format in the file
3. The PR will be merged once it receives approval from at least one reviewer
4. Ensure all CI checks pass before requesting a review

### Development Best Practices

1. **Feature Flags**: Use feature flags for new features to allow for gradual rollout
2. **Error Handling**: Implement proper error handling and logging
3. **Performance**: Consider performance implications of your changes
4. **Accessibility**: Ensure UI components are accessible
5. **Security**: Follow security best practices, especially for API endpoints
6. **Documentation**: Update documentation to reflect your changes

### Setting Up a Development Environment

For detailed instructions on setting up a development environment, see the [Development Environment Setup](#development-environment-setup) section.

## Debugging

### Frontend Debugging

1. Use the browser's developer tools
2. Use React DevTools for component debugging
3. Add `console.log` statements (remove before committing)
4. Use the `debugger` statement to pause execution

### Backend Debugging

1. Use the `--inspect` flag with Node.js:
   ```bash
   NODE_OPTIONS='--inspect' npm run dev
   ```
2. Connect Chrome DevTools to the Node.js process
3. Use logging with different log levels:
   ```typescript
   import { logger } from '../lib/utils/logger';

   logger.debug('Detailed debug information');
   logger.info('General information');
   logger.warn('Warning message');
   logger.error('Error message', error);
   ```

### Common Issues

#### "Module not found" errors
- Check import paths
- Ensure the module is installed
- Verify tsconfig.json paths configuration

#### API route errors
- Check the server logs
- Verify the request format
- Check authentication and permissions

#### Audio processing issues
- Verify audio file format and integrity
- Check available system resources
- Look for errors in the processing pipeline logs

## Performance Optimization

### Frontend Performance

1. Use React.memo for expensive components
2. Implement virtualization for long lists
3. Optimize images and assets
4. Use code splitting and lazy loading

### Backend Performance

1. Implement caching for expensive operations
2. Use streaming for large file processing
3. Optimize database queries
4. Consider worker threads for CPU-intensive tasks

### Audio Processing Performance

1. Use WebAssembly for performance-critical algorithms
2. Implement batch processing for multiple files
3. Use efficient data structures for feature storage
4. Consider GPU acceleration for ML models

## Deployment

For detailed deployment instructions, refer to the [DEPLOYMENT.md](../DEPLOYMENT.md) document.

