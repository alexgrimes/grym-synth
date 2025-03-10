import { MemoryVisualizer } from './memory-viz';
import * as fs from 'fs';
import * as path from 'path';

describe('MemoryVisualizer', () => {
  let visualizer: MemoryVisualizer;
  const TEST_OUTPUT_DIR = path.join(__dirname, 'test-output');
  const TEST_REPORT_PATH = path.join(TEST_OUTPUT_DIR, 'memory-report.html');
  const TEST_MEMORY_LIMIT = 16 * 1024 * 1024 * 1024; // 16GB

  beforeEach(() => {
    visualizer = new MemoryVisualizer();
    
    // Ensure test output directory exists
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_REPORT_PATH)) {
      fs.unlinkSync(TEST_REPORT_PATH);
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmdirSync(TEST_OUTPUT_DIR);
    }
  });

  describe('Memory Tracking', () => {
    it('should track memory snapshots', () => {
      const snapshot = {
        timestamp: 1000,
        heap: 1024 * 1024, // 1MB
        external: 512 * 1024, // 512KB
        arrayBuffers: 0,
        total: 1536 * 1024,
        rss: 2048 * 1024
      };

      visualizer.track(snapshot);
      const data = visualizer.getVisualizationData();

      expect(data.timestamps).toContain(1000);
      expect(data.heapUsage).toContain(1024 * 1024);
      expect(data.externalUsage).toContain(512 * 1024);
    });

    it('should track model events', () => {
      const snapshot = {
        timestamp: 1000,
        heap: 1024 * 1024,
        external: 512 * 1024,
        arrayBuffers: 0,
        total: 1536 * 1024,
        rss: 2048 * 1024
      };

      const event = {
        type: 'load' as const,
        model: 'testModel',
        timestamp: 1000
      };

      visualizer.track(snapshot, event);
      const data = visualizer.getVisualizationData();

      expect(data.modelEvents).toHaveLength(1);
      expect(data.modelEvents[0]).toEqual({
        time: 1000,
        event: 'load',
        model: 'testModel'
      });
    });
  });

  describe('Report Generation', () => {
    it('should generate HTML report', async () => {
      // Add some test data
      for (let i = 0; i < 5; i++) {
        visualizer.track({
          timestamp: i * 1000,
          heap: (1024 * 1024) * (i + 1), // Increasing heap usage
          external: 512 * 1024,
          arrayBuffers: 0,
          total: ((1024 * 1024) * (i + 1)) + (512 * 1024),
          rss: ((1024 * 1024) * (i + 1)) + (1024 * 1024)
        });
      }

      await visualizer.generateReport(TEST_REPORT_PATH, TEST_MEMORY_LIMIT);

      expect(fs.existsSync(TEST_REPORT_PATH)).toBe(true);
      
      const content = fs.readFileSync(TEST_REPORT_PATH, 'utf8');
      expect(content).toContain('Memory Usage Over Time');
      expect(content).toContain('chart.js');
      expect(content).toContain('Memory Usage (MB)');
    });

    it('should include model events in report', async () => {
      // Add test data with events
      visualizer.track({
        timestamp: 1000,
        heap: 1024 * 1024,
        external: 512 * 1024,
        arrayBuffers: 0,
        total: 1536 * 1024,
        rss: 2048 * 1024
      }, {
        type: 'load',
        model: 'modelA',
        timestamp: 1000
      });

      visualizer.track({
        timestamp: 2000,
        heap: 2048 * 1024,
        external: 512 * 1024,
        arrayBuffers: 0,
        total: 2560 * 1024,
        rss: 3072 * 1024
      }, {
        type: 'unload',
        model: 'modelA',
        timestamp: 2000
      });

      await visualizer.generateReport(TEST_REPORT_PATH, TEST_MEMORY_LIMIT);

      const content = fs.readFileSync(TEST_REPORT_PATH, 'utf8');
      expect(content).toContain('modelA');
      expect(content).toContain('load');
      expect(content).toContain('unload');
    });
  });

  describe('Data Formatting', () => {
    it('should format memory values in MB for chart', async () => {
      const largeMemory = 1024 * 1024 * 100; // 100MB
      
      visualizer.track({
        timestamp: 1000,
        heap: largeMemory,
        external: largeMemory / 2,
        arrayBuffers: 0,
        total: largeMemory * 1.5,
        rss: largeMemory * 2
      });

      await visualizer.generateReport(TEST_REPORT_PATH, TEST_MEMORY_LIMIT);
      
      const content = fs.readFileSync(TEST_REPORT_PATH, 'utf8');
      // Verify memory values are converted to MB in chart data
      expect(content).toContain('100'); // 100MB
      expect(content).toContain('50'); // 50MB
    });

    it('should format timestamps correctly', async () => {
      const oneMinute = 60 * 1000; // 1 minute in ms
      
      visualizer.track({
        timestamp: oneMinute,
        heap: 1024 * 1024,
        external: 512 * 1024,
        arrayBuffers: 0,
        total: 1536 * 1024,
        rss: 2048 * 1024
      });

      await visualizer.generateReport(TEST_REPORT_PATH, TEST_MEMORY_LIMIT);
      
      const content = fs.readFileSync(TEST_REPORT_PATH, 'utf8');
      expect(content).toContain('1:00'); // 1 minute
    });
  });
});