#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "\n${YELLOW}Running Test Infrastructure Tests${NC}\n"

# Run Jest with infrastructure config
JEST_CONFIG="$(dirname "$0")/jest.config.js"

# Check if watch mode is requested
WATCH_MODE=""
if [ "$1" == "--watch" ]; then
  WATCH_MODE="--watch"
fi

# Run tests
echo -e "${YELLOW}Using config:${NC} $JEST_CONFIG\n"

if npx jest --config "$JEST_CONFIG" $WATCH_MODE; then
  echo -e "\n${GREEN}All test infrastructure tests passed!${NC}\n"
  
  # Show coverage if available
  if [ -f "coverage/test-infrastructure/lcov-report/index.html" ]; then
    echo -e "${YELLOW}Coverage report available at:${NC}"
    echo "coverage/test-infrastructure/lcov-report/index.html"
  fi
  
  exit 0
else
  echo -e "\n${RED}Test infrastructure tests failed!${NC}\n"
  
  # Show error report if available
  if [ -f "coverage/test-infrastructure/junit.xml" ]; then
    echo -e "${YELLOW}Detailed error report available at:${NC}"
    echo "coverage/test-infrastructure/junit.xml"
  fi
  
  exit 1
fi