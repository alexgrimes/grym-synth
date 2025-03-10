// Simple standalone performance verification script
const { FeatureMemorySystem } = require('../dist/core/feature-memory-system');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

async function runQuickVerification() {
    console.log(`${YELLOW}Starting Quick Performance Verification...${RESET}\n`);

    const system = new FeatureMemorySystem({
        cacheSize: 1000,
        maxPatterns: 10000,
        persistenceEnabled: false
    });

    // Create test pattern
    const testPattern = {
        id: 'test_1',
        features: new Map([
            ['type', 'test'],
            ['category', 'unit_test'],
            ['value', '1']
        ]),
        confidence: 0.9,
        timestamp: new Date(),
        metadata: {
            source: 'test',
            category: 'test',
            frequency: 1,
            lastUpdated: new Date()
        }
    };

    // Test 1: Pattern Recognition
    console.log(`${YELLOW}Testing Pattern Recognition Performance...${RESET}`);
    const recognitionLatencies = [];
    for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        await system.recognizePattern(testPattern.features);
        recognitionLatencies.push(performance.now() - start);
    }

    // Test 2: Pattern Storage
    console.log(`${YELLOW}Testing Pattern Storage Performance...${RESET}`);
    const storageLatencies = [];
    for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        await system.storePattern({ ...testPattern, id: `test_${i}` });
        storageLatencies.push(performance.now() - start);
    }

    // Test 3: Concurrent Operations
    console.log(`${YELLOW}Testing Concurrent Operations...${RESET}`);
    const concurrentStart = performance.now();
    await Promise.all(
        Array.from({ length: 100 }, (_, i) => 
            Promise.all([
                system.storePattern({ ...testPattern, id: `concurrent_${i}` }),
                system.recognizePattern(testPattern.features)
            ])
        )
    );
    const concurrentLatency = performance.now() - concurrentStart;

    // Calculate metrics
    const calculateMetrics = (latencies) => ({
        avg: latencies.reduce((a, b) => a + b) / latencies.length,
        p95: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)],
        min: Math.min(...latencies),
        max: Math.max(...latencies)
    });

    const recognitionMetrics = calculateMetrics(recognitionLatencies);
    const storageMetrics = calculateMetrics(storageLatencies);
    const concurrentMetrics = {
        avg: concurrentLatency / 200, // 200 total operations
        operations: 200,
        totalTime: concurrentLatency
    };

    // Print results
    console.log('\nResults:');
    console.log('\nPattern Recognition:');
    console.log(`  Average Latency: ${recognitionMetrics.avg.toFixed(2)}ms ${recognitionMetrics.avg < 50 ? GREEN + '✓' : RED + '✗'}${RESET}`);
    console.log(`  P95 Latency: ${recognitionMetrics.p95.toFixed(2)}ms ${recognitionMetrics.p95 < 100 ? GREEN + '✓' : RED + '✗'}${RESET}`);

    console.log('\nPattern Storage:');
    console.log(`  Average Latency: ${storageMetrics.avg.toFixed(2)}ms ${storageMetrics.avg < 20 ? GREEN + '✓' : RED + '✗'}${RESET}`);
    console.log(`  P95 Latency: ${storageMetrics.p95.toFixed(2)}ms ${storageMetrics.p95 < 50 ? GREEN + '✓' : RED + '✗'}${RESET}`);

    console.log('\nConcurrent Operations:');
    console.log(`  Average Latency per Operation: ${concurrentMetrics.avg.toFixed(2)}ms ${concurrentMetrics.avg < 30 ? GREEN + '✓' : RED + '✗'}${RESET}`);
    console.log(`  Operations per Second: ${(1000 / concurrentMetrics.avg).toFixed(2)}`);

    // Check memory usage
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`\nMemory Usage: ${memoryUsage.toFixed(2)}MB ${memoryUsage < 200 ? GREEN + '✓' : RED + '✗'}${RESET}`);

    // Overall status
    const passed = 
        recognitionMetrics.avg < 50 &&
        recognitionMetrics.p95 < 100 &&
        storageMetrics.avg < 20 &&
        storageMetrics.p95 < 50 &&
        concurrentMetrics.avg < 30 &&
        memoryUsage < 200;

    console.log(`\nOverall Status: ${passed ? GREEN + 'PASSED' : RED + 'FAILED'}${RESET}`);

    await system.destroy();
}

// Run verification if executed directly
if (require.main === module) {
    runQuickVerification().catch(error => {
        console.error(`${RED}Verification failed:${RESET}`, error);
        process.exit(1);
    });
}