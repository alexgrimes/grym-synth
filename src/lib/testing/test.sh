#!/bin/bash

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

run_command() {
    echo -e "${YELLOW}Running:${NC} $1"
    if eval "$1"; then
        echo -e "\n${GREEN}Success!${NC}\n"
        return 0
    else
        echo -e "\n${RED}Failed!${NC}\n"
        return 1
    }
}

show_help() {
    echo "Test Runner for Error Handling Tests"
    echo
    echo "Usage: ./test.sh [command]"
    echo
    echo "Commands:"
    echo "  all       Run all tests"
    echo "  watch     Run tests in watch mode"
    echo "  coverage  Run tests with coverage"
    echo "  verify    Run verification tests"
    echo "  quick     Quick test run"
    echo "  help      Show this help message"
    echo
    exit 0
}

# Main script
case "$1" in
    "all")
        print_header "Running All Tests"
        run_command "npm run test:error"
        ;;
    "watch")
        print_header "Running Tests in Watch Mode"
        run_command "npm run test:error:watch"
        ;;
    "coverage")
        print_header "Running Tests with Coverage"
        run_command "npm run test:error -- --coverage"
        ;;
    "verify")
        print_header "Running Verification Tests"
        run_command "npm run test:error -- --testMatch '**/verification.test.ts'"
        ;;
    "quick")
        print_header "Running Quick Tests"
        run_command "npm run test:error -- --onlyChanged"
        ;;
    "help")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Use './test.sh help' for usage information"
        exit 1
        ;;
esac

# Display test summary if coverage exists
if [ -f "coverage/lcov-report/index.html" ]; then
    print_header "Coverage Summary"
    echo "View detailed coverage report:"
    echo "coverage/lcov-report/index.html"
fi

exit 0