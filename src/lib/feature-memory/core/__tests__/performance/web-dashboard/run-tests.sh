#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

# Directories
ROOT_DIR="$(pwd)"
COVERAGE_DIR="$ROOT_DIR/coverage"
REPORT_DIR="$ROOT_DIR/test-reports"

# Create directories if they don't exist
mkdir -p "$COVERAGE_DIR"
mkdir -p "$REPORT_DIR"

echo -e "${YELLOW}Starting Dashboard Test Suite${NC}\n"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "Checking dependencies..."
DEPS=("node" "npm" "jest")
MISSING_DEPS=()

for dep in "${DEPS[@]}"; do
    if ! command_exists "$dep"; then
        MISSING_DEPS+=("$dep")
    fi
done

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing dependencies: ${MISSING_DEPS[*]}${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Run linting
echo -e "\n${BLUE}Running ESLint...${NC}"
npm run lint || {
    echo -e "${RED}Linting failed${NC}"
    exit 1
}

# Run type checking
echo -e "\n${BLUE}Running TypeScript type checking...${NC}"
npm run type-check || {
    echo -e "${RED}Type checking failed${NC}"
    exit 1
}

# Run tests with coverage
echo -e "\n${BLUE}Running tests with coverage...${NC}"
JEST_ARGS="--coverage --verbose"

# Add CI-specific arguments if running in CI
if [ "$CI" = "true" ]; then
    JEST_ARGS="$JEST_ARGS --ci --runInBand"
fi

# Run tests
jest $JEST_ARGS || {
    echo -e "${RED}Tests failed${NC}"
    EXIT_CODE=1
}

# Generate test report
echo -e "\n${BLUE}Generating test report...${NC}"
node generateTestReport.js

# Check coverage thresholds
COVERAGE_FAILED=0
COVERAGE_FILE="$COVERAGE_DIR/coverage-summary.json"

if [ -f "$COVERAGE_FILE" ]; then
    echo -e "\n${BLUE}Checking coverage thresholds...${NC}"
    
    # Define thresholds
    THRESHOLD_LINES=85
    THRESHOLD_STATEMENTS=85
    THRESHOLD_FUNCTIONS=85
    THRESHOLD_BRANCHES=80

    # Extract coverage values
    LINES_COV=$(jq '.total.lines.pct' "$COVERAGE_FILE")
    STATEMENTS_COV=$(jq '.total.statements.pct' "$COVERAGE_FILE")
    FUNCTIONS_COV=$(jq '.total.functions.pct' "$COVERAGE_FILE")
    BRANCHES_COV=$(jq '.total.branches.pct' "$COVERAGE_FILE")

    # Check against thresholds
    if (( $(echo "$LINES_COV < $THRESHOLD_LINES" | bc -l) )); then
        echo -e "${RED}Lines coverage ($LINES_COV%) is below threshold ($THRESHOLD_LINES%)${NC}"
        COVERAGE_FAILED=1
    fi
    if (( $(echo "$STATEMENTS_COV < $THRESHOLD_STATEMENTS" | bc -l) )); then
        echo -e "${RED}Statements coverage ($STATEMENTS_COV%) is below threshold ($THRESHOLD_STATEMENTS%)${NC}"
        COVERAGE_FAILED=1
    fi
    if (( $(echo "$FUNCTIONS_COV < $THRESHOLD_FUNCTIONS" | bc -l) )); then
        echo -e "${RED}Functions coverage ($FUNCTIONS_COV%) is below threshold ($THRESHOLD_FUNCTIONS%)${NC}"
        COVERAGE_FAILED=1
    fi
    if (( $(echo "$BRANCHES_COV < $THRESHOLD_BRANCHES" | bc -l) )); then
        echo -e "${RED}Branches coverage ($BRANCHES_COV%) is below threshold ($THRESHOLD_BRANCHES%)${NC}"
        COVERAGE_FAILED=1
    fi
else
    echo -e "${RED}Coverage file not found${NC}"
    COVERAGE_FAILED=1
fi

# Generate coverage badge
if [ -f "$COVERAGE_FILE" ]; then
    TOTAL_COVERAGE=$(jq '.total.statements.pct' "$COVERAGE_FILE")
    COLOR=$(
        if (( $(echo "$TOTAL_COVERAGE >= 90" | bc -l) )); then
            echo "brightgreen"
        elif (( $(echo "$TOTAL_COVERAGE >= 80" | bc -l) )); then
            echo "green"
        elif (( $(echo "$TOTAL_COVERAGE >= 70" | bc -l) )); then
            echo "yellow"
        else
            echo "red"
        fi
    )
    
    curl -X POST "https://img.shields.io/badge/coverage-${TOTAL_COVERAGE}%25-${COLOR}" \
        > "$REPORT_DIR/coverage-badge.svg"
fi

# Print summary
echo -e "\n${BLUE}Test Summary:${NC}"
echo "- Total Tests: $(jq '.numTotalTests' "$REPORT_DIR/test-results.json")"
echo "- Passed Tests: $(jq '.numPassedTests' "$REPORT_DIR/test-results.json")"
echo "- Failed Tests: $(jq '.numFailedTests' "$REPORT_DIR/test-results.json")"
echo "- Total Coverage: $TOTAL_COVERAGE%"

# Exit with appropriate code
if [ "$EXIT_CODE" = "1" ] || [ "$COVERAGE_FAILED" = "1" ]; then
    echo -e "\n${RED}Test suite failed${NC}"
    exit 1
else
    echo -e "\n${GREEN}Test suite passed successfully${NC}"
    exit 0
fi