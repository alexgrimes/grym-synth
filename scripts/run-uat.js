#!/usr/bin/env node

/**
 * User Acceptance Test Runner
 *
 * This script runs all UAT scenarios and generates a comprehensive report.
 */

const { createScenarioRunner } = require('../dist/tests/uat/scenario-runner');
const { ReportFormat, ReportType } = require('../dist/tests/uat/report-generator');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  scenariosDir: path.join(process.cwd(), 'src', 'tests', 'uat', 'scenarios'),
  reportsDir: path.join(process.cwd(), 'reports', 'uat'),
  parallel: false,
  filter: {
    includeTags: process.env.UAT_TAGS ? process.env.UAT_TAGS.split(',') : undefined,
    maxPriority: process.env.UAT_MAX_PRIORITY ? parseInt(process.env.UAT_MAX_PRIORITY) : undefined,
    smokeOnly: process.env.UAT_SMOKE_ONLY === 'true'
  },
  reportFormats: [
    ReportFormat.HTML,
    ReportFormat.JSON,
    ReportFormat.MARKDOWN
  ]
};

// Ensure report directory exists
if (!fs.existsSync(config.reportsDir)) {
  fs.mkdirSync(config.reportsDir, { recursive: true });
}

/**
 * Runs all UAT scenarios
 */
async function runUatTests() {
  console.log('Starting User Acceptance Tests');
  console.log('=============================');

  const startTime = Date.now();

  try {
    // Create scenario runner
    const runner = createScenarioRunner({
      scenariosDir: config.scenariosDir,
      reportsDir: config.reportsDir,
      parallel: config.parallel,
      filter: config.filter,
      collectFeedback: true,
      generateReports: true
    });

    // Load scenarios
    console.log('\nLoading scenarios...');
    const scenarios = await runner.loadScenarios();
    console.log(`Found ${scenarios.length} scenarios`);

    if (scenarios.length === 0) {
      console.log('No scenarios found. Exiting.');
      process.exit(0);
    }

    // Log scenario information
    console.log('\nScenarios to run:');
    scenarios.forEach(scenario => {
      console.log(`- ${scenario.name} (${scenario.id}) [Priority: ${scenario.priority}] [Tags: ${scenario.tags.join(', ')}]`);
    });

    // Run scenarios
    console.log('\nRunning scenarios...');
    const results = await runner.runAllScenarios();

    // Calculate statistics
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;
    const passRate = (passedCount / results.length) * 100;

    // Generate reports in all formats
    console.log('\nGenerating reports...');
    for (const format of config.reportFormats) {
      await runner.reportGenerator.generateReport(results, {
        format,
        type: ReportType.DETAILED,
        title: 'Audio Learning Hub - UAT Results',
        description: `User Acceptance Test Results - ${new Date().toLocaleDateString()}`
      });
    }

    // Print summary
    console.log('\nUser Acceptance Test Summary');
    console.log('============================');
    console.log(`Total Duration: ${((Date.now() - startTime) / 1000 / 60).toFixed(2)} minutes`);
    console.log(`Total Scenarios: ${results.length}`);
    console.log(`Passed: ${passedCount} (${passRate.toFixed(2)}%)`);
    console.log(`Failed: ${failedCount} (${(100 - passRate).toFixed(2)}%)`);
    console.log(`Reports saved to: ${config.reportsDir}`);

    // List failed scenarios
    if (failedCount > 0) {
      console.log('\nFailed Scenarios:');
      results.filter(r => !r.passed).forEach(result => {
        console.log(`- ${result.scenario.name} (${result.scenario.id})`);

        // List failed steps
        const failedSteps = result.stepResults.filter(step => !step.passed);
        failedSteps.forEach((step, index) => {
          const stepNumber = result.scenario.steps.findIndex(s => s.number === index + 1) + 1;
          console.log(`  * Step ${stepNumber}: ${step.actualResult}`);
          if (step.error) {
            console.log(`    Error: ${step.error}`);
          }
        });
      });
    }

    // Return success code if all scenarios passed
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('UAT tests failed:', error);
    process.exit(1);
  }
}

// Run the tests
runUatTests();
