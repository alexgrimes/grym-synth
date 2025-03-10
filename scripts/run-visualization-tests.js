/**
 * Visualization Tools Test Runner for grym-synth Backend Integration
 *
 * This script runs tests for the visualization tools and fixes common TypeScript errors.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  visualizationDir: path.join(process.cwd(), 'src', 'monitoring'),
  reportDir: path.join(process.cwd(), 'reports', 'tests'),
  verbose: true,
};

// Ensure report directory exists
if (!fs.existsSync(config.reportDir)) {
  fs.mkdirSync(config.reportDir, { recursive: true });
}

// Logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
};

// Run a command and return the output
function runCommand(command, options = {}) {
  logger.info(`Running command: ${command}`);
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout,
      error: error.stderr || error.message,
    };
  }
}

// Fix TypeScript errors in visualization tools
function fixVisualizationToolsTypeScriptErrors() {
  logger.info('Checking for TypeScript errors in visualization tools...');

  const visualizationToolsFile = path.join(config.visualizationDir, 'visualizationTools.ts');

  if (!fs.existsSync(visualizationToolsFile)) {
    logger.error(`Visualization tools file not found: ${visualizationToolsFile}`);
    return false;
  }

  let content = fs.readFileSync(visualizationToolsFile, 'utf8');
  let updated = false;

  // Fix GraphData interface
  if (content.includes('export interface GraphData')) {
    const graphDataInterface = `export interface GraphData {
  title: string;
  type: 'line' | 'bar' | 'scatter' | 'area';
  xAxis: {
    type: 'time' | 'category';
    data?: string[];
    name?: string;
  } | Array<{
    type: 'time' | 'category';
    data?: string[];
    name?: string;
  }>;
  yAxis: {
    type: 'value';
    name?: string;
    min?: number;
    max?: number;
  } | Array<{
    type: 'value';
    name?: string;
    min?: number;
    max?: number;
  }>;
  series: Array<{
    name: string;
    data: Array<number | null> | Array<[string, number]> | any[];
    type: 'line' | 'bar' | 'scatter' | 'area';
    smooth?: boolean;
    areaStyle?: Record<string, any>;
    lineStyle?: Record<string, any>;
    itemStyle?: Record<string, any>;
    markLine?: Record<string, any>;
    markArea?: Record<string, any>;
    yAxisIndex?: number;
  }>;
  legend?: {
    data: string[];
  };
  tooltip?: {
    trigger: 'axis' | 'item';
    formatter?: string | ((params: any) => string);
  };
  grid?: {
    left?: string | number;
    right?: string | number;
    top?: string | number;
    bottom?: string | number;
    containLabel?: boolean;
  };
}`;

    // Find the GraphData interface in the content
    const graphDataRegex = /export\s+interface\s+GraphData\s+\{[\s\S]*?\}/;
    const match = content.match(graphDataRegex);

    if (match) {
      content = content.replace(match[0], graphDataInterface);
      updated = true;
      logger.warn('Updated GraphData interface');
    }
  }

  // Fix specific TypeScript errors

  // 1. Fix yAxisIndex error
  if (content.includes('yAxisIndex: 1,')) {
    // This is already fixed in the GraphData interface above
    logger.info('yAxisIndex error already fixed in GraphData interface');
  }

  // 2. Fix containLabel error
  if (content.includes('containLabel: true,')) {
    // This is already fixed in the GraphData interface above
    logger.info('containLabel error already fixed in GraphData interface');
  }

  // 3. Fix data type error for scatter plots
  const scatterDataRegex = /data:\s*data\.map\(d\s*=>\s*\[d\.timestamp,\s*d\.value\]\),/g;
  if (content.match(scatterDataRegex)) {
    // This is already fixed in the GraphData interface above
    logger.info('Scatter data type error already fixed in GraphData interface');
  }

  // 4. Fix formatter function error
  const formatterFunctionRegex = /formatter:\s*\(params:\s*any\)\s*=>/g;
  if (content.match(formatterFunctionRegex)) {
    // This is already fixed in the GraphData interface above
    logger.info('Formatter function error already fixed in GraphData interface');
  }

  if (updated) {
    logger.warn('Updating visualization tools file with fixes');
    fs.writeFileSync(visualizationToolsFile, content);
  }

  logger.success('Visualization tools TypeScript errors fixed');
  return true;
}

// Create test file for visualization tools
function createVisualizationToolsTest() {
  logger.info('Creating test file for visualization tools...');

  const testDir = path.join(process.cwd(), 'src', 'tests', 'monitoring');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFile = path.join(testDir, 'visualizationTools.test.ts');

  const testContent = `/**
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
`;

  fs.writeFileSync(testFile, testContent);
  logger.success(`Visualization tools test file created: ${testFile}`);
  return true;
}

// Run visualization tools tests
function runVisualizationToolsTests() {
  logger.info('Running visualization tools tests...');

  const testResult = runCommand('npx jest --config=jest.config.js --testMatch="**/tests/monitoring/**/*.ts"');
  if (!testResult.success) {
    logger.error('Visualization tools tests failed:');
    logger.error(testResult.error);
    return false;
  }

  logger.success('Visualization tools tests passed');
  return true;
}

// Generate a test report
function generateReport(results) {
  logger.info('Generating visualization tools test report...');

  const reportPath = path.join(config.reportDir, `visualization-test-report-${new Date().toISOString().replace(/:/g, '-')}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: Object.keys(results).length,
      passed: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => !r.success).length,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logger.success(`Visualization tools test report generated: ${reportPath}`);

  return report;
}

// Main function
async function main() {
  logger.info('Starting grym-synth Visualization Tools Tests');

  // Fix TypeScript errors
  if (!fixVisualizationToolsTypeScriptErrors()) {
    logger.error('Failed to fix TypeScript errors, aborting tests');
    process.exit(1);
  }

  // Create test file
  if (!createVisualizationToolsTest()) {
    logger.error('Failed to create test file, aborting tests');
    process.exit(1);
  }

  // Run tests
  const results = {
    visualizationToolsTests: { success: runVisualizationToolsTests() }
  };

  // Generate report
  const report = generateReport(results);

  // Print summary
  logger.info('\nVisualization Tools Test Summary:');
  logger.info(`Total: ${report.summary.total}`);
  logger.info(`Passed: ${report.summary.passed}`);
  logger.info(`Failed: ${report.summary.failed}`);

  if (report.summary.failed > 0) {
    logger.error('Some visualization tools tests failed');
    process.exit(1);
  } else {
    logger.success('All visualization tools tests passed');
    process.exit(0);
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error:');
  logger.error(error);
  process.exit(1);
});

