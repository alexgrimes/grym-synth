#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Performance Verification Suite${NC}\n"

# Make sure we're in the correct directory
cd "$(dirname "$0")/../../"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Clean and build
echo -e "${YELLOW}Building project...${NC}"
npm run build

# Run performance tests with garbage collection enabled
echo -e "\n${YELLOW}Running Performance Tests...${NC}"
NODE_ENV=production node --expose-gc ./dist/core/__tests__/run-performance-tests.js

# Check exit status
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}All performance tests passed!${NC}"
    
    # Show detailed results
    echo -e "\n${YELLOW}Detailed Results:${NC}"
    if [ -f "core/__tests__/performance-results.json" ]; then
        node -e "
        const results = require('./core/__tests__/performance-results.json');
        console.table(results.map(r => ({
            Test: r.name,
            'Avg Latency (ms)': r.metrics.averageLatency.toFixed(2),
            'P95 Latency (ms)': r.metrics.p95Latency.toFixed(2),
            'Ops/sec': r.metrics.operationsPerSecond.toFixed(2),
            'Memory (MB)': r.metrics.memoryUsageMB.toFixed(2),
            'Error Rate (%)': (r.metrics.errorRate * 100).toFixed(2)
        })));
        "
    fi
else
    echo -e "\n${RED}Performance tests failed!${NC}"
    exit 1
fi

# Generate performance report
echo -e "\n${YELLOW}Generating Performance Report...${NC}"
node -e "
const fs = require('fs');
const results = require('./core/__tests__/performance-results.json');
const report = {
    timestamp: new Date().toISOString(),
    summary: {
        totalTests: results.length,
        passed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
    },
    performance: {
        recognition: results.find(r => r.name === 'Pattern Recognition')?.metrics,
        storage: results.find(r => r.name === 'Pattern Storage')?.metrics,
        concurrent: results.find(r => r.name === 'Concurrent Operations')?.metrics
    },
    systemInfo: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
    }
};

fs.writeFileSync(
    './core/__tests__/performance-report.json',
    JSON.stringify(report, null, 2)
);
"

# Set executable permissions for test scripts
chmod +x core/__tests__/run-tests.sh
chmod +x core/__tests__/run-verify.sh

echo -e "\n${GREEN}Verification complete! See performance-report.json for detailed results.${NC}"