#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface TestResult {
  success: boolean;
  title: string;
  duration: number;
  error?: string;
}

interface TestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

interface JestAssertionResult {
  status: 'passed' | 'failed';
  title: string;
  duration?: number;
  failureMessages?: string[];
}

interface JestTestResult {
  assertionResults: JestAssertionResult[];
  startTime: number;
  endTime: number;
}

interface JestOutput {
  testResults: JestTestResult[];
}

/**
 * Generate HTML test report
 */
function generateReport(report: TestReport): string {
  const passRate = ((report.passed / report.totalTests) * 100).toFixed(1);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Error Handling Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; }
    .header { margin-bottom: 2rem; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .summary-item { 
      padding: 1rem; 
      border-radius: 4px; 
      text-align: center;
    }
    .pass { background: #e6ffe6; }
    .fail { background: #ffe6e6; }
    .test-case {
      margin-bottom: 1rem;
      padding: 1rem;
      border-radius: 4px;
    }
    .success { background: #f0fff0; }
    .error { background: #fff0f0; }
    .duration { color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Error Handling Test Report</h1>
    <p>Generated: ${report.timestamp}</p>
  </div>

  <div class="summary">
    <div class="summary-item pass">
      <h3>Pass Rate</h3>
      <div>${passRate}%</div>
    </div>
    <div class="summary-item">
      <h3>Total Tests</h3>
      <div>${report.totalTests}</div>
    </div>
    <div class="summary-item pass">
      <h3>Passed</h3>
      <div>${report.passed}</div>
    </div>
    <div class="summary-item fail">
      <h3>Failed</h3>
      <div>${report.failed}</div>
    </div>
  </div>

  <h2>Test Cases</h2>
  ${report.results.map(result => `
    <div class="test-case ${result.success ? 'success' : 'error'}">
      <h3>${result.title}</h3>
      <div class="duration">Duration: ${result.duration}ms</div>
      ${result.error ? `<div class="error">Error: ${result.error}</div>` : ''}
    </div>
  `).join('')}
</body>
</html>
  `.trim();
}

/**
 * Process Jest JSON output
 */
function processJestOutput(jsonPath: string): TestReport {
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8')) as JestOutput;
  
  const results: TestResult[] = data.testResults.flatMap(suite => 
    suite.assertionResults.map(test => ({
      success: test.status === 'passed',
      title: test.title,
      duration: test.duration || 0,
      error: test.failureMessages?.join('\n')
    }))
  );

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    duration: data.testResults.reduce((sum: number, suite: JestTestResult) => 
      sum + suite.endTime - suite.startTime, 0),
    results
  };
}

// Generate report if run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const jsonPath = args[0] || 'test-output.json';
  const outputPath = args[1] || 'test-report.html';

  try {
    const report = processJestOutput(jsonPath);
    const html = generateReport(report);
    writeFileSync(outputPath, html);
    console.log(`Report generated: ${outputPath}`);
  } catch (error) {
    console.error('Failed to generate report:', error);
    process.exit(1);
  }
}

export { generateReport, processJestOutput, TestResult, TestReport };