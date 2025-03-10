/**
 * Migration Script for grym-synth Backend Integration
 *
 * This script migrates the testing and optimization system from the legacy
 * audio-learning-hub directory to a dedicated grym-synth repository.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  sourceDir: process.cwd(), // Current directory (audio-learning-hub)
  targetDir: path.join(process.cwd(), '..', 'grym-synth'), // Parent directory/grym-synth
  filesToMigrate: [
    { source: 'src/tests/api/apiTests.ts', target: 'src/tests/api/apiTests.ts' },
    { source: 'src/tests/integration/endToEndTests.ts', target: 'src/tests/integration/endToEndTests.ts' },
    { source: 'src/tests/performance/benchmarkTests.ts', target: 'src/tests/performance/benchmarkTests.ts' },
    { source: 'src/tests/mocks/apiMocks.ts', target: 'src/tests/mocks/apiMocks.ts' },
    { source: 'src/monitoring/performanceMonitor.ts', target: 'src/monitoring/performanceMonitor.ts' },
    { source: 'src/monitoring/visualizationTools.ts', target: 'src/monitoring/visualizationTools.ts' },
    { source: 'src/resources/resourceManager.ts', target: 'src/resources/resourceManager.ts' },
    { source: 'docs/TESTING-OPTIMIZATION-GUIDE.md', target: 'docs/TESTING-OPTIMIZATION-GUIDE.md' },
    { source: 'scripts/run-tests.js', target: 'scripts/run-tests.js' },
    { source: 'scripts/run-api-tests.js', target: 'scripts/run-api-tests.js' },
    { source: 'scripts/run-visualization-tests.js', target: 'scripts/run-visualization-tests.js' },
    { source: 'scripts/run-resource-tests.js', target: 'scripts/run-resource-tests.js' },
    { source: 'scripts/run-all-tests.js', target: 'scripts/run-all-tests.js' },
    { source: 'scripts/migrate-to-grym-synth.js', target: 'scripts/migrate-to-grym-synth.js' },
  ],
  dirsToCreate: [
    'src/api',
    'src/monitoring',
    'src/resources',
    'src/tests/api',
    'src/tests/integration',
    'src/tests/mocks',
    'src/tests/performance',
    'docs',
    'reports/performance',
    'reports/tests',
    'reports/visualizations',
    'scripts',
  ],
  packageJson: {
    name: 'grym-synth',
    version: '1.0.0',
    description: 'grym-synth Backend Integration',
    main: 'index.js',
    scripts: {
      test: 'node scripts/run-all-tests.js',
      'test:api': 'node scripts/run-api-tests.js',
      'test:visualization': 'node scripts/run-visualization-tests.js',
      'test:resource': 'node scripts/run-resource-tests.js',
      'test:performance': 'node src/tests/performance/benchmarkTests.js',
    },
    dependencies: {
      axios: '^1.6.0',
      uuid: '^9.0.0',
    },
    devDependencies: {
      jest: '^29.7.0',
      'ts-jest': '^29.1.1',
      typescript: '^5.2.2',
      'axios-mock-adapter': '^1.22.0',
    },
  },
  tsConfig: {
    compilerOptions: {
      target: 'es2018',
      module: 'commonjs',
      esModuleInterop: true,
      strict: true,
      outDir: 'dist',
      declaration: true,
      sourceMap: true,
      resolveJsonModule: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  },
  jestConfig: `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**/*.ts',
  ],
  coverageReporters: ['text', 'lcov'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};`,
};

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

// Create the target directory structure
function createDirectoryStructure() {
  logger.info('Creating directory structure...');

  // Create the target directory if it doesn't exist
  if (!fs.existsSync(config.targetDir)) {
    fs.mkdirSync(config.targetDir, { recursive: true });
    logger.success(`Created target directory: ${config.targetDir}`);
  } else {
    logger.warn(`Target directory already exists: ${config.targetDir}`);
  }

  // Create subdirectories
  for (const dir of config.dirsToCreate) {
    const targetDir = path.join(config.targetDir, dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      logger.success(`Created directory: ${targetDir}`);
    } else {
      logger.warn(`Directory already exists: ${targetDir}`);
    }
  }
}

// Copy files from source to target
function copyFiles() {
  logger.info('Copying files...');

  for (const file of config.filesToMigrate) {
    const sourcePath = path.join(config.sourceDir, file.source);
    const targetPath = path.join(config.targetDir, file.target);

    if (fs.existsSync(sourcePath)) {
      // Create the target directory if it doesn't exist
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy the file
      fs.copyFileSync(sourcePath, targetPath);
      logger.success(`Copied ${sourcePath} to ${targetPath}`);
    } else {
      logger.warn(`Source file not found: ${sourcePath}`);
    }
  }
}

// Update paths in files
function updatePaths() {
  logger.info('Updating paths in files...');

  for (const file of config.filesToMigrate) {
    const targetPath = path.join(config.targetDir, file.target);

    if (fs.existsSync(targetPath)) {
      let content = fs.readFileSync(targetPath, 'utf8');

      // Update import paths
      content = content.replace(/from ['"]\.\.\/\.\.\/api\//g, 'from \'../../api/');
      content = content.replace(/from ['"]\.\.\/\.\.\/monitoring\//g, 'from \'../../monitoring/');
      content = content.replace(/from ['"]\.\.\/\.\.\/resources\//g, 'from \'../../resources/');
      content = content.replace(/from ['"]\.\.\/\.\.\/tests\//g, 'from \'../../tests/');

      // Update file paths
      content = content.replace(/['"]\.\.\/\.\.\/src\//g, '\'../../src/');
      content = content.replace(/['"]\.\.\/\.\.\/docs\//g, '\'../../docs/');
      content = content.replace(/['"]\.\.\/\.\.\/reports\//g, '\'../../reports/');

      // Update current working directory references
      content = content.replace(/process\.cwd\(\)/g, 'process.cwd()');

      // Write the updated content back to the file
      fs.writeFileSync(targetPath, content);
      logger.success(`Updated paths in ${targetPath}`);
    } else {
      logger.warn(`Target file not found: ${targetPath}`);
    }
  }
}

// Create package.json
function createPackageJson() {
  logger.info('Creating package.json...');

  const packageJsonPath = path.join(config.targetDir, 'package.json');
  fs.writeFileSync(packageJsonPath, JSON.stringify(config.packageJson, null, 2));
  logger.success(`Created package.json at ${packageJsonPath}`);
}

// Create tsconfig.json
function createTsConfig() {
  logger.info('Creating tsconfig.json...');

  const tsConfigPath = path.join(config.targetDir, 'tsconfig.json');
  fs.writeFileSync(tsConfigPath, JSON.stringify(config.tsConfig, null, 2));
  logger.success(`Created tsconfig.json at ${tsConfigPath}`);
}

// Create jest.config.js
function createJestConfig() {
  logger.info('Creating jest.config.js...');

  const jestConfigPath = path.join(config.targetDir, 'jest.config.js');
  fs.writeFileSync(jestConfigPath, config.jestConfig);
  logger.success(`Created jest.config.js at ${jestConfigPath}`);
}

// Install dependencies
function installDependencies() {
  logger.info('Installing dependencies...');

  // Change to the target directory
  process.chdir(config.targetDir);

  // Install dependencies
  const result = runCommand('npm install');

  if (result.success) {
    logger.success('Dependencies installed successfully');
  } else {
    logger.error('Failed to install dependencies:');
    logger.error(result.error);
  }
}

// Run tests
function runTests() {
  logger.info('Running tests...');

  // Change to the target directory
  process.chdir(config.targetDir);

  // Run tests
  const result = runCommand('npm test');

  if (result.success) {
    logger.success('Tests ran successfully');
  } else {
    logger.error('Tests failed:');
    logger.error(result.error);
  }
}

// Main function
async function main() {
  logger.info('Starting migration to grym-synth repository...');

  // Create directory structure
  createDirectoryStructure();

  // Copy files
  copyFiles();

  // Update paths
  updatePaths();

  // Create configuration files
  createPackageJson();
  createTsConfig();
  createJestConfig();

  // Install dependencies
  installDependencies();

  // Run tests
  runTests();

  logger.success('Migration completed successfully!');
  logger.info(`grym-synth repository is now available at: ${config.targetDir}`);
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error:');
  logger.error(error);
  process.exit(1);
});

