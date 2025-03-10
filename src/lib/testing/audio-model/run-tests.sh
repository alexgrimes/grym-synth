#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

# Get absolute paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../../../"

echo -e "${BLUE}Building TypeScript files...${NC}"

# Use locally installed TypeScript compiler
if ! "$PROJECT_ROOT/node_modules/.bin/tsc" --project "$PROJECT_ROOT/tsconfig.json"; then
    echo -e "${RED}TypeScript compilation failed${NC}"
    exit 1
fi

echo -e "${BLUE}Running audio model tests...${NC}"

# Run Jest tests with custom config
JEST_CONFIG="--config $SCRIPT_DIR/jest.config.js"
TEST_PATH="$SCRIPT_DIR/__tests__"

# Run tests with coverage using local Jest installation
if "$PROJECT_ROOT/node_modules/.bin/jest" $JEST_CONFIG $TEST_PATH --coverage; then
    echo -e "${GREEN}All tests passed successfully!${NC}"
    
    # Display coverage summary
    echo -e "\n${BLUE}Coverage Summary:${NC}"
    cat coverage/lcov-report/index.html | grep -A 4 "<div class='pad1'>"
    
    # Open coverage report in browser if running in interactive mode
    if [ -t 1 ]; then
        echo -e "\n${BLUE}Opening coverage report...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open coverage/lcov-report/index.html
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open coverage/lcov-report/index.html
        elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
            start coverage/lcov-report/index.html
        fi
    fi
    
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi