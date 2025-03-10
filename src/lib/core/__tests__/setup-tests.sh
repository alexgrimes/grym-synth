#!/bin/bash

# Make test scripts executable
chmod +x run-memory-tests.sh
chmod +x check-memory.sh

echo "Test scripts are now executable"
echo "Available commands:"
echo "  ./run-memory-tests.sh  - Run all memory management tests"
echo "  ./check-memory.sh      - Check current memory status"
echo
echo "For Windows users:"
echo "  run-memory-tests.bat   - Run all memory management tests"
echo "  check-memory.bat       - Check current memory status"