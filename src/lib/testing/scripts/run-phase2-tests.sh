#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Running Phase 2 Integration Tests${NC}"
echo "=================================="

# Run project management tests
echo -e "\n${BLUE}Running Project Management Tests${NC}"
npm test "src/lib/testing/project/__tests__/" || {
    echo -e "${RED}Project management tests failed${NC}"
    exit 1
}

# Run audio processing tests
echo -e "\n${BLUE}Running Audio Processing Tests${NC}"
npm test "src/lib/testing/audio/__tests__/" || {
    echo -e "${RED}Audio processing tests failed${NC}"
    exit 1
}

# Run orchestration tests
echo -e "\n${BLUE}Running Orchestration Tests${NC}"
npm test "src/lib/testing/__tests__/orchestration/" || {
    echo -e "${RED}Orchestration tests failed${NC}"
    exit 1
}

# Show test coverage
echo -e "\n${BLUE}Generating Coverage Report${NC}"
npm test -- --coverage --testPathPattern="(project|audio|orchestration)" || {
    echo -e "${RED}Coverage report generation failed${NC}"
    exit 1
}

echo -e "\n${GREEN}All Phase 2 tests completed successfully${NC}"