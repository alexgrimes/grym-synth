#!/bin/bash

# Exit on error
set -e

echo "Setting up test environment..."

# Create Python virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r scripts/requirements.txt

# Install Node dependencies
echo "Installing Node.js dependencies..."
npm install

# Create logs directory if it doesn't exist
mkdir -p logs

# Run tests in sequence
echo "Running test suites..."

# 1. Unit Tests
echo "Running unit tests..."
npm run test tests/services/Wav2Vec2Service.test.ts --silent

# 2. Integration Tests
echo "Running integration tests..."
npm run test tests/integration/Wav2Vec2Integration.test.ts --silent

# 3. Performance Tests
echo "Running performance tests..."
export RUN_PERFORMANCE_TESTS=true
npm run test tests/performance/Wav2Vec2Performance.test.ts --silent

# Parse test results
echo "Test Summary:"
echo "============="

# Check logs for any warnings or errors
echo "Checking logs for warnings and errors..."
if [ -f "logs/wav2vec2.log" ]; then
    echo "Warning count: $(grep -c "WARN" logs/wav2vec2.log)"
    echo "Error count: $(grep -c "ERROR" logs/wav2vec2.log)"
    
    echo "Recent Warnings:"
    grep "WARN" logs/wav2vec2.log | tail -n 5
    
    echo "Recent Errors:"
    grep "ERROR" logs/wav2vec2.log | tail -n 5
fi

# Print memory usage statistics
echo "Memory Usage Summary:"
if [ -f "logs/wav2vec2.log" ]; then
    echo "Peak memory usage entries:"
    grep "memory" logs/wav2vec2.log | grep "heapUsed" | sort -nr | head -n 5
fi

echo "Test run complete."