#!/bin/bash

# Run memory management tests with specific heap size and GC exposed
node \
  --expose-gc \
  --max-old-space-size=256 \
  --trace-gc \
  node_modules/jest/bin/jest.js \
  src/lib/core/__tests__/basic-memory-manager.test.ts \
  --runInBand \
  --detectOpenHandles \
  --verbose

# Print memory stats after tests
node -e "console.log('Final Memory Stats:', process.memoryUsage())"