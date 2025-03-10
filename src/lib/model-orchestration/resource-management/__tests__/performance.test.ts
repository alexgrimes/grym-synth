import { initializeResourceManagement, createModelResourceManager } from '..';
import { performance } from 'perf_hooks';
import os from 'node:os';

jest.mock('node:os');

describe('Resource Management Performance', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Mock system resources
    (os.totalmem as jest.Mock).mockReturnValue(16000000000);
    (os.freemem as jest.Mock).mockReturnValue(8000000000);
    (os.cpus as jest.Mock).mockReturnValue(Array(8).fill({
      times: {
        user: 100,
        nice: 0,
        sys: 50,
        idle: 150,
        irq: 0
      }
    }));
    (os.loadavg as jest.Mock).mockReturnValue([2.5, 2.0, 1.8]);
  });

  describe('Resource Detection Performance', () => {
    it('should detect resources within 100ms', async () => {
      const system = await createModelResourceManager();
      
      const start = performance.now();
      const resources = system.detector.getCurrentResources();
      const end = performance.now();
      
      const detectionTime = end - start;
      expect(detectionTime).toBeLessThan(100);
      
      await system.shutdown();
    });

    it('should maintain detection speed under load', async () => {
      const system = await createModelResourceManager();
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        system.detector.getCurrentResources();
        const end = performance.now();
        times.push(end - start);
      }

      const averageTime = times.reduce((a, b) => a + b) / times.length;
      const maxTime = Math.max(...times);

      expect(averageTime).toBeLessThan(50); // Average should be well below limit
      expect(maxTime).toBeLessThan(100); // Even worst case should meet limit

      await system.shutdown();
    });
  });

  describe('Monitoring Overhead', () => {
    it('should maintain CPU usage below 1%', async () => {
      const system = await createModelResourceManager();
      const monitoringDuration = 5000; // 5 seconds
      const measurementInterval = 100; // 100ms
      const measurements: number[] = [];

      const startTime = Date.now();
      
      // Start monitoring
      system.detector.start();

      // Measure CPU usage over time
      while (Date.now() - startTime < monitoringDuration) {
        const startUsage = process.cpuUsage();
        await new Promise(resolve => setTimeout(resolve, measurementInterval));
        const endUsage = process.cpuUsage(startUsage);
        
        // Convert to percentage
        const totalUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        const usagePercent = (totalUsage / measurementInterval) * 100;
        measurements.push(usagePercent);
      }

      const averageUsage = measurements.reduce((a, b) => a + b) / measurements.length;
      expect(averageUsage).toBeLessThan(1);

      await system.shutdown();
    });
  });

  describe('Memory Overhead', () => {
    it('should maintain memory overhead below 50MB', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const system = await createModelResourceManager();
      system.detector.start();

      // Perform some operations to ensure memory is allocated
      for (let i = 0; i < 1000; i++) {
        system.detector.getCurrentResources();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryOverhead = (finalMemory - initialMemory) / (1024 * 1024); // Convert to MB

      expect(memoryOverhead).toBeLessThan(50);

      await system.shutdown();
    });
  });

  describe('Resource Updates', () => {
    it('should handle rapid resource updates efficiently', async () => {
      const system = await createModelResourceManager();
      const updates: any[] = [];
      let updateCount = 0;

      // Configure fast updates
      const fastSystem = await initializeResourceManagement(
        {
          updateIntervalMs: 10, // Very fast updates
          thresholds: {
            memory: { warning: 80, critical: 90 },
            cpu: { warning: 70, critical: 85 },
            disk: { warning: 85, critical: 95 }
          },
          constraints: {
            memory: {
              maxAllocation: 1024 * 1024 * 1024,
              warningThreshold: 1024 * 1024 * 1024 * 0.8,
              criticalThreshold: 1024 * 1024 * 1024 * 0.9
            },
            cpu: {
              maxUtilization: 85,
              warningThreshold: 70,
              criticalThreshold: 80
            },
            disk: {
              minAvailable: 1024 * 1024 * 1024,
              warningThreshold: 1024 * 1024 * 1024 * 2,
              criticalThreshold: 1024 * 1024 * 1024
            }
          }
        },
        () => updateCount++
      );

      // Run for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should have ~100 updates (1000ms / 10ms)
      // Allow some variance due to setTimeout precision
      expect(updateCount).toBeGreaterThan(80);
      expect(updateCount).toBeLessThan(120);

      await fastSystem.shutdown();
      await system.shutdown();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent resource requests efficiently', async () => {
      const system = await createModelResourceManager();
      const concurrentRequests = 100;
      const start = performance.now();

      // Make concurrent requests
      await Promise.all(
        Array(concurrentRequests)
          .fill(0)
          .map(() => Promise.resolve(system.detector.getCurrentResources()))
      );

      const end = performance.now();
      const timePerRequest = (end - start) / concurrentRequests;

      // Each request should still be fast
      expect(timePerRequest).toBeLessThan(1);

      await system.shutdown();
    });
  });
});