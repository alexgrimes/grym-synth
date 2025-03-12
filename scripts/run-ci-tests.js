const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const TEST_SUITES = [
  {
    name: 'All Tests',
    command: 'npx',
    args: ['npm', 'test'],
    timeout: 120000
  },
  {
    name: 'API Tests',
    command: 'npx',
    args: ['npm', 'run', 'test:api'],
    timeout: 60000
  },
  {
    name: 'Visualization Tests',
    command: 'npx',
    args: ['npm', 'run', 'test:visualization'],
    timeout: 60000
  },
  {
    name: 'Resource Tests',
    command: 'npx',
    args: ['npm', 'run', 'test:resource'],
    timeout: 60000
  },
  {
    name: 'Performance Tests',
    command: 'npx',
    args: ['npm', 'run', 'test:performance'],
    timeout: 300000
  }
];

async function runTests() {
  const results = {
    successful: [],
    failed: []
  };

  for (const suite of TEST_SUITES) {
    console.log(`\nRunning ${suite.name}...`);

    try {
      await new Promise((resolve, reject) => {
        const process = spawn(suite.command, suite.args, {
          stdio: 'inherit',
          shell: true
        });

        const timeout = setTimeout(() => {
          process.kill();
          reject(new Error(`${suite.name} timed out after ${suite.timeout}ms`));
        }, suite.timeout);

        process.on('close', (code) => {
          clearTimeout(timeout);
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`${suite.name} failed with code ${code}`));
          }
        });

        process.on('error', (err) => {
          clearTimeout(timeout);
          reject(new Error(`Failed to start ${suite.name}: ${err.message}`));
        });
      });

      results.successful.push(suite.name);
      console.log(`✓ ${suite.name} completed successfully`);
    } catch (error) {
      results.failed.push({
        name: suite.name,
        error: error.message
      });
      console.error(`✗ ${suite.name} failed:`, error.message);
    }
  }

  return results;
}

async function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: TEST_SUITES.length,
      successful: results.successful.length,
      failed: results.failed.length
    }
  };

  const reportPath = path.join(__dirname, '../reports/test-results.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log('\nTest Summary:');
  console.log(`Total: ${report.summary.total}`);
  console.log(`Successful: ${report.summary.successful}`);
  console.log(`Failed: ${report.summary.failed}`);

  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(generateReport)
  .catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
