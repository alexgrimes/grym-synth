import { CapabilityScorer } from '../capability-scorer';
import { performance } from 'perf_hooks';

describe('CapabilityScorer Performance', () => {
  let scorer: CapabilityScorer;

  beforeEach(() => {
    scorer = new CapabilityScorer({
      decayFactor: 0.95,
      timeWindow: 7 * 24 * 60 * 60 * 1000,
      minSamples: 5
    });
  });

  it('should meet capability assessment performance target (<50ms)', async () => {
    const modelId = 'test-model';
    const capability = 'code';
    
    // Warm up
    for (let i = 0; i < 5; i++) {
      await scorer.recordSuccess(modelId, capability, {
        latency: 100,
        resourceUsage: 0.3
      });
    }

    // Measure assessment time
    const start = performance.now();
    const score = await scorer.getCapabilityScore(modelId, capability);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
    expect(score).toBeGreaterThan(0);
  });

  it('should meet score calculation performance target (<10ms)', async () => {
    const modelId = 'test-model';
    const capability = 'code';

    // Prepare data
    for (let i = 0; i < 10; i++) {
      await scorer.recordSuccess(modelId, capability, {
        latency: 100 + Math.random() * 50,
        resourceUsage: 0.3 + Math.random() * 0.2
      });
    }

    // Measure calculation time
    const start = performance.now();
    const modelScores = await scorer.getModelScores(modelId);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
    expect(modelScores.capabilities.size).toBeGreaterThan(0);
  });

  it('should maintain memory overhead within limits (<20MB)', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const numOperations = 1000;

    // Generate significant test data
    for (let i = 0; i < numOperations; i++) {
      const modelId = `model-${i % 10}`; // 10 different models
      const capability = i % 2 === 0 ? 'code' : 'reasoning';
      
      await scorer.recordSuccess(modelId, capability, {
        latency: 100 + Math.random() * 50,
        resourceUsage: 0.3 + Math.random() * 0.2
      });
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryOverhead = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB

    expect(memoryOverhead).toBeLessThan(20);
  });

  it('should achieve target cache hit rate (>80%)', async () => {
    const modelId = 'test-model';
    const capability = 'code';
    let cacheHits = 0;
    const numOperations = 100;

    // Prepare initial data
    for (let i = 0; i < 5; i++) {
      await scorer.recordSuccess(modelId, capability, {
        latency: 100,
        resourceUsage: 0.3
      });
    }

    // Perform operations and track cache hits
    for (let i = 0; i < numOperations; i++) {
      const start = performance.now();
      const score = await scorer.getCapabilityScore(modelId, capability);
      const duration = performance.now() - start;

      // Assume cache hit if retrieval is very fast (<1ms)
      if (duration < 1) {
        cacheHits++;
      }
    }

    const hitRate = (cacheHits / numOperations) * 100;
    expect(hitRate).toBeGreaterThan(80);
  });

  it('should handle concurrent operations efficiently', async () => {
    const numConcurrentOps = 50;
    const operations = Array(numConcurrentOps).fill(null).map((_, i) => ({
      modelId: `model-${i % 5}`,
      capability: i % 2 === 0 ? 'code' : 'reasoning'
    }));

    const start = performance.now();
    
    await Promise.all(operations.map(op => 
      scorer.recordSuccess(op.modelId, op.capability, {
        latency: 100 + Math.random() * 50,
        resourceUsage: 0.3 + Math.random() * 0.2
      })
    ));

    const duration = performance.now() - start;
    const avgTimePerOp = duration / numConcurrentOps;

    expect(avgTimePerOp).toBeLessThan(5); // Average 5ms per operation
  });

  it('should maintain performance under sustained load', async () => {
    const numOperations = 1000;
    const modelIds = Array(10).fill(null).map((_, i) => `model-${i}`);
    const capabilities = ['code', 'reasoning', 'vision'];
    const timings: number[] = [];

    for (let i = 0; i < numOperations; i++) {
      const modelId = modelIds[i % modelIds.length];
      const capability = capabilities[i % capabilities.length];
      
      const start = performance.now();
      await scorer.recordSuccess(modelId, capability, {
        latency: 100 + Math.random() * 50,
        resourceUsage: 0.3 + Math.random() * 0.2
      });
      timings.push(performance.now() - start);

      // Check scores periodically
      if (i % 100 === 0) {
        await scorer.getModelScores(modelId);
      }
    }

    const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
    const p95Timing = timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];

    expect(avgTiming).toBeLessThan(10); // Average operation under 10ms
    expect(p95Timing).toBeLessThan(20); // 95th percentile under 20ms
  });
});