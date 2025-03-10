#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Feature Memory System Performance Test Runner${NC}"
echo "================================================"

# Make verify-performance.js executable
chmod +x verify-performance.js

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check environment
echo -e "\n${YELLOW}Checking environment...${NC}"
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "Node.js version: $NODE_VERSION"
echo "npm version: $NPM_VERSION"

# Set performance test environment variables
export NODE_ENV=test
export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"

# Run performance verification
echo -e "\n${YELLOW}Running performance verification...${NC}"
./verify-performance.js

# Check exit status
STATUS=$?
if [ $STATUS -eq 0 ]; then
    echo -e "\n${GREEN}Performance verification completed successfully!${NC}"
else
    echo -e "\n${RED}Performance verification failed with status $STATUS${NC}"
    exit $STATUS
fi