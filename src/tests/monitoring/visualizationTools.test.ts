/**
 * Tests for Visualization Tools
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { visualizationTools } from '../../monitoring/visualizationTools';
import * as fs from 'fs';
import * as path from 'path';

// Mock the performanceMonitor
jest.mock('../../monitoring/performanceMonitor', () => ({
  performanceMonitor: {
    getResponseTimeMetrics: jest.fn().mockReturnValue({
      average: 100,
      p50: 90,
      p95: 150,
      p99: 200,
      min: 50,
      max: 250,
      count: 100,
      successRate: 0.95,
      timeRange: {
        start: '2025-01-01T00:00:00.000Z',
        end: '2025-01-02T00:00:00.000Z',
      },
    }),
    responseTimeMetrics: [
      {
        endpoint: 'test-endpoint',
        timestamp: '2025-01-01T12:00:00.000Z',
        durationMs: 100,
        success: true,
      },
      {
        endpoint: 'test-endpoint',
        timestamp: '2025-01-01T12:01:00.000Z',
        durationMs: 150,
        success: true,
      },
      {
        endpoint: 'test-endpoint',
        timestamp: '2025-01-01T12:02:00.000Z',
        durationMs: 200,
        success: false,
      },
    ],
    memoryUsageMetrics: [
      {
        operation: 'test-operation',
        timestamp: '2025-01-01T12:00:00.000Z',
        heapUsedMB: 100,
        heapTotalMB: 200,
        externalMB: 50,
        rssKB: 300000,
      },
      {
        operation: 'test-operation',
        timestamp: '2025-01-01T12:01:00.000Z',
        heapUsedMB: 110,
        heapTotalMB: 200,
        externalMB: 50,
        rssKB: 310000,
      },
    ],
    modelInitMetrics: [
      {
        modelId: 'test-model',
        timestamp: '2025-01-01T12:00:00.000Z',
        durationMs: 5000,
        success: true,
      },
      {
        modelId: 'test-model',
        timestamp: '2025-01-01T12:01:00.000Z',
        durationMs: 5500,
        success: false,
      },
    ],
  },
}));

// Mock fs.writeFileSync
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
}));

describe('Visualization Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should generate response time graph', () => {
    const graph = visualizationTools.generateResponseTimeGraph({
      title: 'Test Response Time Graph',
      endpoint: 'test-endpoint',
    });

    expect(graph).toBeDefined();
    expect(graph.title).toBe('Test Response Time Graph');
    expect(graph.type).toBe('line');
    expect(graph.series.length).toBeGreaterThan(0);
  });

  test('should generate error rate graph', () => {
    const graph = visualizationTools.generateErrorRateGraph({
      title: 'Test Error Rate Graph',
    });

    expect(graph).toBeDefined();
    expect(graph.title).toBe('Test Error Rate Graph');
    expect(graph.type).toBe('line');
    expect(graph.series.length).toBeGreaterThan(0);
  });

  test('should generate memory usage graph', () => {
    const graph = visualizationTools.generateMemoryUsageGraph({
      title: 'Test Memory Usage Graph',
      operation: 'test-operation',
    });

    expect(graph).toBeDefined();
    expect(graph.title).toBe('Test Memory Usage Graph');
    expect(graph.type).toBe('line');
    expect(graph.series.length).toBeGreaterThan(0);
  });

  test('should generate model initialization graph', () => {
    const graph = visualizationTools.generateModelInitGraph({
      title: 'Test Model Init Graph',
      modelId: 'test-model',
    });

    expect(graph).toBeDefined();
    expect(graph.title).toBe('Test Model Init Graph');
    expect(graph.type).toBe('scatter');
    expect(graph.series.length).toBeGreaterThan(0);
  });

  test('should save graph to file', async () => {
    const graph = visualizationTools.generateResponseTimeGraph();
    const filePath = await visualizationTools.saveGraph(graph, 'test-graph.json');

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(filePath).toBeDefined();
  });

  test('should generate dashboard with multiple graphs', async () => {
    const filePath = await visualizationTools.generateDashboard({
      title: 'Test Dashboard',
      includeResponseTimes: true,
      includeErrorRates: true,
      includeMemoryUsage: true,
      includeModelInit: true,
    });

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(filePath).toBeDefined();
  });
});
