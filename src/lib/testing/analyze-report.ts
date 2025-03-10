import * as fs from 'fs';
import * as path from 'path';
import { MemorySnapshot } from './memory-profile';

interface AnalysisResult {
  peakMemory: number;
  averageMemory: number;
  memoryGrowth: number;
  leakProbability: string;
  recommendations: string[];
  modelStats: {
    [modelId: string]: {
      loadTime: number;
      unloadTime: number;
      peakMemory: number;
      memoryRetained: number;
    };
  };
}

export class MemoryAnalyzer {
  private static readonly LEAK_THRESHOLD = 100 * 1024 * 1024; // 100MB
  private static readonly REPORTS_DIR = path.join(__dirname, '../../../reports/memory');

  static async analyzeResults(): Promise<AnalysisResult> {
    const snapshotsPath = path.join(this.REPORTS_DIR, 'snapshots.json');
    const snapshots: MemorySnapshot[] = JSON.parse(
      await fs.promises.readFile(snapshotsPath, 'utf8')
    );

    const result: AnalysisResult = {
      peakMemory: 0,
      averageMemory: 0,
      memoryGrowth: 0,
      leakProbability: 'low',
      recommendations: [],
      modelStats: {}
    };

    // Calculate basic metrics
    result.peakMemory = Math.max(...snapshots.map(s => s.heap + s.external));
    result.averageMemory = snapshots.reduce((sum, s) => sum + s.heap + s.external, 0) / snapshots.length;
    result.memoryGrowth = snapshots[snapshots.length - 1].heap - snapshots[0].heap;

    // Analyze memory patterns
    this.analyzeMemoryPatterns(snapshots, result);

    // Generate recommendations
    this.generateRecommendations(result);

    // Save analysis results
    await this.saveAnalysis(result);

    return result;
  }

  private static analyzeMemoryPatterns(snapshots: MemorySnapshot[], result: AnalysisResult): void {
    let currentModel: string | null = null;
    let modelLoadSnapshot: MemorySnapshot | null = null;

    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];
      const memoryDiff = (curr.heap + curr.external) - (prev.heap + prev.external);

      // Detect model load/unload patterns
      if (curr.label?.includes('load_')) {
        currentModel = curr.label.split('load_')[1];
        modelLoadSnapshot = curr;
        result.modelStats[currentModel] = {
          loadTime: curr.timestamp - prev.timestamp,
          unloadTime: 0,
          peakMemory: curr.heap + curr.external,
          memoryRetained: 0
        };
      } else if (curr.label?.includes('unload_') && currentModel) {
        const modelId = curr.label.split('unload_')[1];
        if (modelId === currentModel && modelLoadSnapshot) {
          result.modelStats[modelId].unloadTime = curr.timestamp - prev.timestamp;
          result.modelStats[modelId].memoryRetained = 
            (curr.heap + curr.external) - (modelLoadSnapshot.heap + modelLoadSnapshot.external);
        }
        currentModel = null;
        modelLoadSnapshot = null;
      }

      // Detect potential memory leaks
      if (memoryDiff > this.LEAK_THRESHOLD && !curr.label?.includes('load_')) {
        result.recommendations.push(
          `Possible memory leak detected at ${this.formatTimestamp(curr.timestamp)}: +${this.formatBytes(memoryDiff)}`
        );
      }
    }

    // Analyze leak probability
    const sustainedGrowth = snapshots.length >= 3 &&
      snapshots.slice(-3).every((s, i, arr) => 
        i === 0 || (s.heap > arr[i - 1].heap)
      );

    if (sustainedGrowth) {
      result.leakProbability = result.memoryGrowth > this.LEAK_THRESHOLD ? 'high' : 'medium';
    }
  }

  private static generateRecommendations(result: AnalysisResult): void {
    // Base recommendations
    if (result.peakMemory > 14 * 1024 * 1024 * 1024) { // 14GB
      result.recommendations.push('Peak memory usage is close to the 16GB limit. Consider optimizing model loading sequence.');
    }

    // Model-specific recommendations
    for (const [modelId, stats] of Object.entries(result.modelStats)) {
      if (stats.memoryRetained > 50 * 1024 * 1024) { // 50MB
        result.recommendations.push(
          `Model ${modelId} retains ${this.formatBytes(stats.memoryRetained)} after unload. Check cleanup process.`
        );
      }

      if (stats.loadTime > 5000) { // 5 seconds
        result.recommendations.push(
          `Model ${modelId} takes ${stats.loadTime}ms to load. Consider optimization or preloading.`
        );
      }
    }

    // Memory growth recommendations
    if (result.leakProbability !== 'low') {
      result.recommendations.push(
        `Memory growth of ${this.formatBytes(result.memoryGrowth)} detected. Review model unloading and garbage collection.`
      );
    }
  }

  private static async saveAnalysis(result: AnalysisResult): Promise<void> {
    const reportPath = path.join(this.REPORTS_DIR, 'analysis.json');
    await fs.promises.writeFile(reportPath, JSON.stringify(result, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(result);
    await fs.promises.writeFile(
      path.join(this.REPORTS_DIR, 'analysis.html'),
      htmlReport
    );
  }

  private static generateHtmlReport(result: AnalysisResult): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Memory Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        .warning { color: #c94a4a; }
        .recommendation { margin: 5px 0; padding: 5px; border-left: 3px solid #4a90c9; }
        .model-stat { margin: 10px 0; padding: 10px; background: #fff; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>Memory Analysis Report</h1>
    
    <h2>Overview</h2>
    <div class="metric">Peak Memory: ${this.formatBytes(result.peakMemory)}</div>
    <div class="metric">Average Memory: ${this.formatBytes(result.averageMemory)}</div>
    <div class="metric">Memory Growth: ${this.formatBytes(result.memoryGrowth)}</div>
    <div class="metric">Leak Probability: 
        <span class="${result.leakProbability === 'high' ? 'warning' : ''}">${result.leakProbability}</span>
    </div>

    <h2>Model Statistics</h2>
    ${Object.entries(result.modelStats).map(([modelId, stats]) => `
        <div class="model-stat">
            <h3>Model: ${modelId}</h3>
            <div>Load Time: ${stats.loadTime}ms</div>
            <div>Unload Time: ${stats.unloadTime}ms</div>
            <div>Peak Memory: ${this.formatBytes(stats.peakMemory)}</div>
            <div>Memory Retained: ${this.formatBytes(stats.memoryRetained)}</div>
        </div>
    `).join('')}

    <h2>Recommendations</h2>
    ${result.recommendations.map(rec => `
        <div class="recommendation">${rec}</div>
    `).join('')}
</body>
</html>`;
  }

  private static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private static formatTimestamp(ms: number): string {
    return new Date(ms).toISOString().substr(11, 12);
  }
}

// Run analysis if executed directly
if (require.main === module) {
  MemoryAnalyzer.analyzeResults()
    .then(result => {
      console.log('\nMemory Analysis Complete');
      console.log('=======================');
      console.log(`Peak Memory: ${MemoryAnalyzer['formatBytes'](result.peakMemory)}`);
      console.log(`Average Memory: ${MemoryAnalyzer['formatBytes'](result.averageMemory)}`);
      console.log(`Memory Growth: ${MemoryAnalyzer['formatBytes'](result.memoryGrowth)}`);
      console.log(`Leak Probability: ${result.leakProbability}`);
      console.log('\nRecommendations:');
      result.recommendations.forEach(rec => console.log(`- ${rec}`));
      console.log('\nReports generated in reports/memory/');
    })
    .catch(error => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}