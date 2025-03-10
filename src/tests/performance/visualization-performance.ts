/**
 * Visualization Performance Tests
 *
 * Tests for 3D visualization performance
 */
import { performance } from 'perf_hooks';
import { systemBootstrap } from '../../services/integration';
import { Logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger({ namespace: 'visualization-perf' });

// Define visualization test configuration
interface VisualizationTestConfig {
  // Test data complexity levels
  complexityLevels: {
    // Number of data points
    dataPoints: number;

    // Number of iterations per complexity level
    iterations: number;
  }[];

  // Output directory for results
  outputDir: string;

  // Whether to generate detailed reports
  detailedReporting: boolean;

  // Whether to test with different rendering options
  testRenderingOptions: boolean;

  // Rendering options to test
  renderingOptions: {
    resolution: 'low' | 'medium' | 'high';
    effects: 'minimal' | 'standard' | 'advanced';
    antialiasing: boolean;
  }[];
}

// Define visualization test result
interface VisualizationTestResult {
  // Timestamp
  timestamp: Date;

  // Results per complexity level
  complexityResults: {
    // Number of data points
    dataPoints: number;

    // Rendering times in milliseconds
    renderingTimes: number[];

    // Average rendering time in milliseconds
    averageRenderingTimeMs: number;

    // Frames per second
    fps: number;

    // Memory usage in bytes
    memoryUsage: number;

    // GPU usage percentage (if available)
    gpuUsage?: number;
  }[];

  // Results per rendering option (if tested)
  renderingOptionResults?: {
    // Rendering option
    option: {
      resolution: 'low' | 'medium' | 'high';
      effects: 'minimal' | 'standard' | 'advanced';
      antialiasing: boolean;
    };

    // Average rendering time in milliseconds
    averageRenderingTimeMs: number;

    // Frames per second
    fps: number;

    // Memory usage in bytes
    memoryUsage: number;
  }[];

  // Overall performance score (0-100)
  performanceScore: number;

  // Recommendations
  recommendations: string[];
}

// Default visualization test configuration
const DEFAULT_CONFIG: VisualizationTestConfig = {
  complexityLevels: [
    { dataPoints: 1000, iterations: 10 },
    { dataPoints: 10000, iterations: 5 },
    { dataPoints: 100000, iterations: 3 }
  ],
  outputDir: path.join(process.cwd(), 'visualization-test-results'),
  detailedReporting: true,
  testRenderingOptions: true,
  renderingOptions: [
    { resolution: 'low', effects: 'minimal', antialiasing: false },
    { resolution: 'medium', effects: 'standard', antialiasing: true },
    { resolution: 'high', effects: 'advanced', antialiasing: true }
  ]
};

/**
 * Run visualization performance tests
 */
export async function runVisualizationPerformanceTests(
  config: Partial<VisualizationTestConfig> = {}
): Promise<VisualizationTestResult> {
  // Merge with default configuration
  const testConfig: VisualizationTestConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };

  logger.info('Starting visualization performance tests', testConfig);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(testConfig.outputDir)) {
    fs.mkdirSync(testConfig.outputDir, { recursive: true });
  }

  // Bootstrap system
  const { registry } = systemBootstrap();

  // Get visualization service
  const visualizationService = registry.getComponent('visualizationService');

  if (!visualizationService) {
    throw new Error('Visualization service not found');
  }

  // Prepare result
  const result: VisualizationTestResult = {
    timestamp: new Date(),
    complexityResults: [],
    performanceScore: 0,
    recommendations: []
  };

  try {
    // Test different complexity levels
    for (const level of testConfig.complexityLevels) {
      logger.info(`Testing complexity level: ${level.dataPoints} data points`);

      // Generate test data
      const testData = generateTestData(level.dataPoints);

      // Run iterations
      const renderingTimes: number[] = [];
      let totalMemoryUsage = 0;

      for (let i = 0; i < level.iterations; i++) {
        logger.debug(`Running iteration ${i + 1}/${level.iterations}`);

        // Measure rendering time
        const startTime = performance.now();

        // Render visualization
        await (visualizationService as any).visualize({
          data: testData,
          options: {
            resolution: 'medium',
            effects: 'standard',
            antialiasing: true
          }
        });

        const endTime = performance.now();
        const renderingTime = endTime - startTime;

        renderingTimes.push(renderingTime);

        // Measure memory usage
        const memoryUsage = process.memoryUsage().heapUsed;
        totalMemoryUsage += memoryUsage;

        logger.debug(`Iteration ${i + 1} completed in ${renderingTime.toFixed(2)}ms`);
      }

      // Calculate average rendering time
      const averageRenderingTimeMs = renderingTimes.reduce((sum, time) => sum + time, 0) / renderingTimes.length;

      // Calculate frames per second
      const fps = 1000 / averageRenderingTimeMs;

      // Calculate average memory usage
      const averageMemoryUsage = totalMemoryUsage / level.iterations;

      // Add to results
      result.complexityResults.push({
        dataPoints: level.dataPoints,
        renderingTimes,
        averageRenderingTimeMs,
        fps,
        memoryUsage: averageMemoryUsage
      });
    }

    // Test different rendering options if enabled
    if (testConfig.testRenderingOptions) {
      logger.info('Testing different rendering options');

      result.renderingOptionResults = [];

      // Generate medium complexity test data
      const testData = generateTestData(10000);

      for (const option of testConfig.renderingOptions) {
        logger.debug(`Testing rendering option: ${JSON.stringify(option)}`);

        // Run iterations
        const renderingTimes: number[] = [];
        let totalMemoryUsage = 0;

        for (let i = 0; i < 5; i++) {
          // Measure rendering time
          const startTime = performance.now();

          // Render visualization
          await (visualizationService as any).visualize({
            data: testData,
            options: option
          });

          const endTime = performance.now();
          const renderingTime = endTime - startTime;

          renderingTimes.push(renderingTime);

          // Measure memory usage
          const memoryUsage = process.memoryUsage().heapUsed;
          totalMemoryUsage += memoryUsage;
        }

        // Calculate average rendering time
        const averageRenderingTimeMs = renderingTimes.reduce((sum, time) => sum + time, 0) / renderingTimes.length;

        // Calculate frames per second
        const fps = 1000 / averageRenderingTimeMs;

        // Calculate average memory usage
        const averageMemoryUsage = totalMemoryUsage / 5;

        // Add to results
        result.renderingOptionResults.push({
          option,
          averageRenderingTimeMs,
          fps,
          memoryUsage: averageMemoryUsage
        });
      }
    }

    // Calculate performance score
    result.performanceScore = calculatePerformanceScore(result);

    // Generate recommendations
    result.recommendations = generateRecommendations(result);

    // Generate report
    if (testConfig.detailedReporting) {
      generateTestReport(result, testConfig);
    }

    // Log results
    logger.info('Visualization performance tests completed', {
      performanceScore: result.performanceScore,
      recommendations: result.recommendations.length
    });

    return result;
  } catch (error) {
    logger.error('Visualization performance tests failed', { error });
    throw error;
  }
}

/**
 * Generate test data
 */
function generateTestData(dataPoints: number): any {
  // Generate 3D audio visualization data
  const data = {
    frequencies: new Float32Array(dataPoints),
    amplitudes: new Float32Array(dataPoints),
    timePoints: new Float32Array(dataPoints)
  };

  // Fill with random data
  for (let i = 0; i < dataPoints; i++) {
    data.frequencies[i] = Math.random() * 20000; // 0-20kHz
    data.amplitudes[i] = Math.random();
    data.timePoints[i] = i / dataPoints;
  }

  return data;
}

/**
 * Calculate performance score
 */
function calculatePerformanceScore(result: VisualizationTestResult): number {
  // Calculate score based on FPS and memory usage
  let score = 0;

  // Score based on FPS at different complexity levels
  const fpsScores = result.complexityResults.map(level => {
    // Target FPS: 60 for low complexity, 30 for medium, 15 for high
    const targetFps = level.dataPoints <= 1000 ? 60 : (level.dataPoints <= 10000 ? 30 : 15);
    const fpsRatio = Math.min(level.fps / targetFps, 1);
    return fpsRatio * 25; // Max 25 points per level
  });

  score += fpsScores.reduce((sum, s) => sum + s, 0);

  // Score based on memory efficiency
  const memoryScores = result.complexityResults.map(level => {
    // Expected memory usage: 10MB for low, 50MB for medium, 200MB for high
    const expectedMemory = level.dataPoints <= 1000 ? 10 * 1024 * 1024 :
                          (level.dataPoints <= 10000 ? 50 * 1024 * 1024 : 200 * 1024 * 1024);
    const memoryRatio = Math.min(expectedMemory / level.memoryUsage, 1);
    return memoryRatio * 8; // Max 8 points per level
  });

  score += memoryScores.reduce((sum, s) => sum + s, 0);

  // Score based on rendering options performance (if available)
  if (result.renderingOptionResults) {
    const optionScores = result.renderingOptionResults.map(option => {
      // Higher score for maintaining good FPS at higher quality settings
      const qualityFactor = option.option.resolution === 'high' ? 1.5 :
                           (option.option.resolution === 'medium' ? 1.2 : 1);
      const effectsFactor = option.option.effects === 'advanced' ? 1.5 :
                           (option.option.effects === 'standard' ? 1.2 : 1);
      const aaFactor = option.option.antialiasing ? 1.2 : 1;

      const targetFps = 30;
      const fpsRatio = Math.min(option.fps / targetFps, 1);

      return fpsRatio * qualityFactor * effectsFactor * aaFactor * 4; // Max 4 points per option
    });

    score += optionScores.reduce((sum, s) => sum + s, 0);
  }

  // Ensure score is between 0-100
  return Math.min(Math.max(Math.round(score), 0), 100);
}

/**
 * Generate recommendations
 */
function generateRecommendations(result: VisualizationTestResult): string[] {
  const recommendations: string[] = [];

  // Check FPS at highest complexity
  const highComplexityResult = result.complexityResults.find(r => r.dataPoints >= 100000);
  if (highComplexityResult && highComplexityResult.fps < 15) {
    recommendations.push('Optimize rendering for high complexity visualizations to achieve at least 15 FPS');
  }

  // Check memory usage growth
  if (result.complexityResults.length >= 2) {
    const lowComplexity = result.complexityResults.find(r => r.dataPoints <= 1000);
    const highComplexity = result.complexityResults.find(r => r.dataPoints >= 100000);

    if (lowComplexity && highComplexity) {
      const memoryGrowthFactor = highComplexity.memoryUsage / lowComplexity.memoryUsage;
      const dataGrowthFactor = highComplexity.dataPoints / lowComplexity.dataPoints;

      if (memoryGrowthFactor > dataGrowthFactor) {
        recommendations.push('Improve memory efficiency for large datasets - memory usage is growing faster than data size');
      }
    }
  }

  // Check rendering options performance
  if (result.renderingOptionResults) {
    const highQualityOption = result.renderingOptionResults.find(
      r => r.option.resolution === 'high' && r.option.effects === 'advanced'
    );

    if (highQualityOption && highQualityOption.fps < 10) {
      recommendations.push('Optimize high-quality rendering to achieve at least 10 FPS');
    }

    // Check if antialiasing has significant impact
    const withAA = result.renderingOptionResults.find(
      r => r.option.resolution === 'medium' && r.option.antialiasing
    );

    const withoutAA = result.renderingOptionResults.find(
      r => r.option.resolution === 'medium' && !r.option.antialiasing
    );

    if (withAA && withoutAA && withAA.fps < withoutAA.fps * 0.7) {
      recommendations.push('Consider optimizing antialiasing implementation - it has a significant performance impact');
    }
  }

  // Overall performance score recommendations
  if (result.performanceScore < 50) {
    recommendations.push('Major performance optimizations needed for visualization system');
  } else if (result.performanceScore < 70) {
    recommendations.push('Moderate performance improvements recommended for visualization system');
  }

  return recommendations;
}

/**
 * Generate test report
 */
function generateTestReport(
  result: VisualizationTestResult,
  config: VisualizationTestConfig
): void {
  const reportPath = path.join(
    config.outputDir,
    `visualization-perf-report-${result.timestamp.toISOString().replace(/:/g, '-')}.json`
  );

  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

  logger.info(`Visualization performance report generated: ${reportPath}`);
}

// If this file is run directly, execute the tests
if (require.main === module) {
  runVisualizationPerformanceTests()
    .then(result => {
      console.log(JSON.stringify({
        performanceScore: result.performanceScore,
        recommendations: result.recommendations
      }, null, 2));

      process.exit(0);
    })
    .catch(error => {
      console.error('Visualization performance tests failed:', error);
      process.exit(1);
    });
}
