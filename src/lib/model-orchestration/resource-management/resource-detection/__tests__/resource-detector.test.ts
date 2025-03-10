import { ResourceDetector } from '../resource-detector';
import { ResourceDetectionConfig, SystemResources, ResourceAlert } from '../types';
import os from 'node:os';

// Mock os module
jest.mock('node:os');

// Test implementation of ResourceDetector
class TestBaseResourceDetector extends ResourceDetector {
  private mockSystemResources: SystemResources;

  constructor(config: ResourceDetectionConfig, onUpdate?: (resources: SystemResources) => void, onAlert?: (alert: ResourceAlert) => void) {
    super(config, onUpdate, onAlert);
    this.mockSystemResources = {
      memory: {
        total: 16000000000,
        available: 8000000000,
        used: 8000000000
      },
      cpu: {
        cores: 8,
        utilization: 50,
        loadAverage: [2.5, 2.0, 1.8]
      },
      disk: {
        total: 1000000000000,
        available: 500000000000,
        used: 500000000000
      }
    };
  }

  protected override detectMemoryResources() {
    return {
      total: os.totalmem(),
      available: os.freemem(),
      used: os.totalmem() - os.freemem()
    };
  }

  protected override detectCpuResources() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Calculate CPU utilization
    const utilization = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    return {
      cores: cpus.length,
      utilization,
      loadAverage: loadAvg
    };
  }

  protected override detectDiskResources() {
    return {
      total: this.mockSystemResources.disk.total,
      available: this.mockSystemResources.disk.available,
      used: this.mockSystemResources.disk.used
    };
  }
}

describe('ResourceDetector', () => {
  // Default test configuration
  const defaultConfig: ResourceDetectionConfig = {
    updateIntervalMs: 1000,
    thresholds: {
      memory: {
        warning: 80,
        critical: 90
      },
      cpu: {
        warning: 70,
        critical: 85
      },
      disk: {
        warning: 85,
        critical: 95
      }
    },
    constraints: {
      memory: {
        maxAllocation: 1000000000,
        warningThreshold: 800000000,
        criticalThreshold: 900000000
      },
      cpu: {
        maxUtilization: 85,
        warningThreshold: 70,
        criticalThreshold: 80
      },
      disk: {
        minAvailable: 1000000000,
        warningThreshold: 2000000000,
        criticalThreshold: 1000000000
      }
    }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();

    // Setup os module mocks
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

  describe('Resource Detection', () => {
    it('should detect system resources correctly', () => {
      const detector = new TestBaseResourceDetector(defaultConfig);
      const resources = detector.getCurrentResources();

      expect(resources.memory.total).toBe(16000000000);
      expect(resources.memory.available).toBe(8000000000);
      expect(resources.cpu.cores).toBe(8);
      expect(resources.disk.total).toBe(1000000000000);
    });

    it('should calculate resource utilization correctly', () => {
      const detector = new TestBaseResourceDetector(defaultConfig);
      const availability = detector.getAvailability();

      const expectedMemoryUtilization = 50; // (8GB used / 16GB total) * 100

      expect(availability.memory.utilizationPercent).toBe(expectedMemoryUtilization);
      expect(availability.cpu.utilizationPercent).toBeGreaterThan(0);
      expect(availability.disk.utilizationPercent).toBe(50);
    });
  });

  describe('Monitoring and Alerts', () => {
    it('should emit alerts when thresholds are exceeded', () => {
      const alerts: ResourceAlert[] = [];
      const onAlert = (alert: ResourceAlert) => alerts.push(alert);

      // Mock critical memory usage
      (os.freemem as jest.Mock).mockReturnValue(16000000000 * 0.05);

      const detector = new TestBaseResourceDetector(defaultConfig, undefined, onAlert);
      detector.getCurrentResources();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].type).toBe('memory');
    });

    it('should start and stop monitoring correctly', () => {
      jest.useFakeTimers();

      const updates: SystemResources[] = [];
      const onUpdate = (resources: SystemResources) => updates.push(resources);

      const detector = new TestBaseResourceDetector(defaultConfig, onUpdate);
      detector.start();

      // Should have initial update
      expect(updates.length).toBe(1);

      // Advance timer
      jest.advanceTimersByTime(defaultConfig.updateIntervalMs);
      expect(updates.length).toBe(2);

      detector.stop();

      // No more updates after stopping
      jest.advanceTimersByTime(defaultConfig.updateIntervalMs);
      expect(updates.length).toBe(2);

      jest.useRealTimers();
    });
  });

  describe('Health Status', () => {
    it('should calculate correct health status', () => {
      const detector = new TestBaseResourceDetector(defaultConfig);
      const availability = detector.getAvailability();

      // With default mock values (50% utilization), should be healthy
      expect(availability.status).toBe('healthy');

      // Mock critical CPU usage
      (os.cpus as jest.Mock).mockReturnValue(Array(8).fill({
        times: {
          user: 900,
          nice: 0,
          sys: 50,
          idle: 50,
          irq: 0
        }
      }));

      const criticalAvailability = detector.getAvailability();
      expect(criticalAvailability.status).toBe('critical');
    });
  });
});