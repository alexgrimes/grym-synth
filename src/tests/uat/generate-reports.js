/**
 * UAT Report Generator Script
 *
 * This script generates reports from UAT test results
 */
const { ReportGenerator } = require('./report-generator');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const formatArg = args.find(arg => arg.startsWith('--format='));
const format = formatArg ? formatArg.split('=')[1] : 'html';

async function main() {
  try {
    console.log('UAT Report Generator');
    console.log('===================');

    // Initialize report generator
    const reportGenerator = new ReportGenerator();

    // Find the latest results file
    const resultsDir = path.join(process.cwd(), 'reports', 'uat');
    if (!fs.existsSync(resultsDir)) {
      console.error('No UAT results directory found. Run UAT tests first.');
      process.exit(1);
    }

    const resultFiles = fs.readdirSync(resultsDir)
      .filter(file => file.startsWith('uat-results-') && file.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    if (resultFiles.length === 0) {
      console.error('No UAT result files found. Run UAT tests first.');
      process.exit(1);
    }

    const latestResultFile = resultFiles[0];
    console.log(`Using latest result file: ${latestResultFile}`);

    // Load results
    const resultsPath = path.join(resultsDir, latestResultFile);
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

    console.log(`Loaded ${results.length} scenario results`);

    // Prepare report data
    const reportData = {
      results,
      feedback: [], // No feedback for now
      feedbackSummaries: [], // No feedback summaries for now
      screenshots: [], // No screenshots for now
      logs: [], // No logs for now
      metrics: {
        successRate: (results.filter(r => r.success).length / results.length) * 100,
        averageExecutionTimeMs: results.reduce((sum, r) => sum + r.totalDurationMs, 0) / results.length,
        totalExecutionTimeMs: results.reduce((sum, r) => sum + r.totalDurationMs, 0),
        startTime: new Date(Math.min(...results.map(r => new Date(r.startTime).getTime()))),
        endTime: new Date(Math.max(...results.map(r => new Date(r.endTime).getTime())))
      }
    };

    // Generate report
    const reportOptions = {
      format: format,
      outputDir: path.join(process.cwd(), 'reports', 'uat'),
      title: 'Audio Learning Hub - UAT Report',
      includeFeedback: false,
      includeScreenshots: false,
      includeLogs: false,
      includeMetrics: true,
      includeRecommendations: true
    };

    console.log(`Generating ${format.toUpperCase()} report...`);
    const reportPath = await reportGenerator.generateReport(reportData, reportOptions);

    console.log(`Report generated: ${reportPath}`);

    // Generate all formats if requested
    if (format === 'all') {
      const formats = ['html', 'json', 'md', 'csv'];

      for (const fmt of formats) {
        if (fmt !== 'html') { // Already generated HTML
          reportOptions.format = fmt;
          const path = await reportGenerator.generateReport(reportData, reportOptions);
          console.log(`${fmt.toUpperCase()} report generated: ${path}`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error generating UAT reports:', error);
    process.exit(1);
  }
}

main();
