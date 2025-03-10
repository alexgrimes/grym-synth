#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Feature Memory System Performance Tests${NC}\n"

# Check if node and npm are installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Compile TypeScript
echo -e "${YELLOW}Compiling TypeScript...${NC}"
npx tsc || {
    echo -e "${RED}TypeScript compilation failed${NC}"
    exit 1
}

# Run performance tests
echo -e "\n${YELLOW}Running Performance Tests...${NC}"
node --expose-gc run-performance-tests.js | tee performance-results.log

# Analyze results
echo -e "\n${YELLOW}Analyzing Results...${NC}"
node -e "
const results = require('./performance-results.json');
const targets = {
    'Pattern Recognition': {
        maxAverageLatency: 50,
        maxP95Latency: 100,
        minOpsPerSecond: 100
    },
    'Pattern Storage': {
        maxAverageLatency: 20,
        maxP95Latency: 50,
        minOpsPerSecond: 200
    },
    'Concurrent Operations': {
        maxAverageLatency: 30,
        maxErrorRate: 0.01,
        maxMemoryUsageMB: 200
    }
};

let allPassed = true;

results.forEach(result => {
    const target = targets[result.name];
    if (!target) return;

    console.log(\`\n\${result.name} Results:\`);
    console.log(\`  Average Latency: \${result.metrics.averageLatency.toFixed(2)}ms\`);
    console.log(\`  P95 Latency: \${result.metrics.p95Latency.toFixed(2)}ms\`);
    console.log(\`  Operations/sec: \${result.metrics.operationsPerSecond.toFixed(2)}\`);
    console.log(\`  Error Rate: \${(result.metrics.errorRate * 100).toFixed(2)}%\`);
    console.log(\`  Memory Usage: \${result.metrics.memoryUsageMB.toFixed(2)}MB\`);

    const passed = 
        (!target.maxAverageLatency || result.metrics.averageLatency <= target.maxAverageLatency) &&
        (!target.maxP95Latency || result.metrics.p95Latency <= target.maxP95Latency) &&
        (!target.minOpsPerSecond || result.metrics.operationsPerSecond >= target.minOpsPerSecond) &&
        (!target.maxErrorRate || result.metrics.errorRate <= target.maxErrorRate) &&
        (!target.maxMemoryUsageMB || result.metrics.memoryUsageMB <= target.maxMemoryUsageMB);

    console.log(\`  Status: \${passed ? '✅ PASSED' : '❌ FAILED'}\`);
    allPassed = allPassed && passed;
});

process.exit(allPassed ? 0 : 1);
"

# Check if tests passed
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}All performance tests passed!${NC}"
else
    echo -e "\n${RED}Some performance tests failed. Check results above.${NC}"
    exit 1
fi