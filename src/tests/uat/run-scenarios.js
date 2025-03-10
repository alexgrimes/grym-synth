/**
 * UAT Scenario Runner Script
 *
 * This script runs all UAT scenarios or a specific scenario if specified
 */
const { ScenarioRunner } = require('./scenario-runner');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const scenarioArg = args.find(arg => arg.startsWith('--scenario='));
const specificScenario = scenarioArg ? scenarioArg.split('=')[1] : null;

// Initialize scenario runner
const runner = new ScenarioRunner();

async function main() {
  try {
    console.log('UAT Scenario Runner');
    console.log('==================');

    // Load scenarios from the scenarios directory
    const scenariosDir = path.join(__dirname, 'scenarios');
    const scenarioFiles = fs.readdirSync(scenariosDir)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    console.log(`Found ${scenarioFiles.length} scenario files`);

    // Load and run scenarios
    const scenarios = [];
    const results = [];

    for (const file of scenarioFiles) {
      try {
        const scenarioModule = require(path.join(scenariosDir, file));

        // Find exported scenarios in the module
        const moduleScenarios = Object.values(scenarioModule)
          .filter(value =>
            typeof value === 'object' &&
            value.id &&
            value.name &&
            Array.isArray(value.steps)
          );

        if (moduleScenarios.length === 0) {
          console.warn(`No valid scenarios found in ${file}`);
          continue;
        }

        scenarios.push(...moduleScenarios);
      } catch (error) {
        console.error(`Error loading scenario file ${file}:`, error);
      }
    }

    console.log(`Loaded ${scenarios.length} scenarios`);

    // Filter scenarios if a specific one was requested
    const scenariosToRun = specificScenario
      ? scenarios.filter(s => s.id === specificScenario)
      : scenarios;

    if (scenariosToRun.length === 0) {
      console.error(`No scenarios found${specificScenario ? ` matching ID: ${specificScenario}` : ''}`);
      process.exit(1);
    }

    console.log(`Running ${scenariosToRun.length} scenarios...`);

    // Run scenarios
    for (const scenario of scenariosToRun) {
      console.log(`\nRunning scenario: ${scenario.name} (${scenario.id})`);

      try {
        const result = await runner.runScenario(scenario);
        results.push(result);

        // Log result
        if (result.success) {
          console.log(`✅ Scenario passed: ${scenario.name}`);
        } else {
          console.log(`❌ Scenario failed: ${scenario.name}`);

          if (result.error) {
            console.error(`Error: ${result.error.message}`);
          }

          // Log failed steps
          const failedSteps = result.stepResults.filter(step => !step.success);
          if (failedSteps.length > 0) {
            console.log('Failed steps:');
            failedSteps.forEach(step => {
              console.log(`  - ${step.name}: ${step.error || 'Unknown error'}`);
            });
          }
        }
      } catch (error) {
        console.error(`Error running scenario ${scenario.name}:`, error);
      }
    }

    // Print summary
    const passedScenarios = results.filter(r => r.success).length;
    const failedScenarios = results.length - passedScenarios;

    console.log('\nSummary:');
    console.log(`Total scenarios: ${results.length}`);
    console.log(`Passed: ${passedScenarios}`);
    console.log(`Failed: ${failedScenarios}`);
    console.log(`Success rate: ${((passedScenarios / results.length) * 100).toFixed(2)}%`);

    // Save results to file
    const resultsDir = path.join(process.cwd(), 'reports', 'uat');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const resultsPath = path.join(
      resultsDir,
      `uat-results-${new Date().toISOString().replace(/:/g, '-')}.json`
    );

    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${resultsPath}`);

    // Exit with appropriate code
    process.exit(failedScenarios > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error running UAT scenarios:', error);
    process.exit(1);
  }
}

main();
