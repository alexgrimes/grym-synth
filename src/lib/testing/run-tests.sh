#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default options
VERBOSE=false
FAIL_FAST=false
PATTERN=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -f|--fail-fast)
      FAIL_FAST=true
      shift
      ;;
    -p|--pattern)
      PATTERN="$2"
      shift
      shift
      ;;
    -h|--help)
      echo "Error Handling Test Runner"
      echo
      echo "Usage: ./run-tests.sh [options]"
      echo
      echo "Options:"
      echo "  -v, --verbose     Show detailed test output"
      echo "  -f, --fail-fast   Stop on first failure"
      echo "  -p, --pattern     Test name pattern to run"
      echo "  -h, --help        Show this help message"
      echo
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Build command arguments
ARGS=""
if [ "$VERBOSE" = true ]; then
  ARGS="$ARGS --verbose"
fi
if [ "$FAIL_FAST" = true ]; then
  ARGS="$ARGS --fail-fast"
fi
if [ ! -z "$PATTERN" ]; then
  ARGS="$ARGS --pattern \"$PATTERN\""
fi

# Print test run info
echo -e "${YELLOW}Running error handling tests...${NC}"
echo "Verbose: $VERBOSE"
echo "Fail Fast: $FAIL_FAST"
if [ ! -z "$PATTERN" ]; then
  echo "Pattern: $PATTERN"
fi
echo

# Run tests
START_TIME=$(date +%s)

if ts-node run-error-tests.ts $ARGS; then
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo -e "${GREEN}Tests completed successfully in ${DURATION}s${NC}"
  exit 0
else
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo -e "${RED}Tests failed after ${DURATION}s${NC}"
  exit 1
fi