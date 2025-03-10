#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { resolve, join } from 'path';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

interface SetupStep {
  name: string;
  action: () => boolean;
}

/**
 * Setup test environment
 */
class TestEnvironmentSetup {
  private readonly testRoot: string;
  private readonly coverageDir: string;

  constructor() {
    this.testRoot = resolve(__dirname);
    this.coverageDir = resolve(this.testRoot, '../../../coverage');
  }

  /**
   * Run all setup steps
   */
  async setup(): Promise<boolean> {
    console.log('\nSetting up test environment...\n');

    const steps: SetupStep[] = [
      {
        name: 'Create directories',
        action: () => this.createDirectories()
      },
      {
        name: 'Install dependencies',
        action: () => this.installDependencies()
      },
      {
        name: 'Configure Jest',
        action: () => this.configureJest()
      },
      {
        name: 'Make scripts executable',
        action: () => this.makeScriptsExecutable()
      },
      {
        name: 'Verify setup',
        action: () => this.verifySetup()
      }
    ];

    let success = true;
    for (const step of steps) {
      success = await this.runStep(step) && success;
    }

    if (success) {
      console.log('\n✅ Test environment setup complete!\n');
      this.showNextSteps();
    } else {
      console.error('\n❌ Test environment setup failed!\n');
    }

    return success;
  }

  /**
   * Create required directories
   */
  private createDirectories(): boolean {
    try {
      const dirs = [
        this.coverageDir,
        join(this.coverageDir, 'test-infrastructure'),
        join(this.coverageDir, 'error-handling')
      ];

      dirs.forEach(dir => {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to create directories:', error);
      return false;
    }
  }

  /**
   * Install test dependencies
   */
  private installDependencies(): boolean {
    const deps = [
      '@types/jest',
      'jest',
      'ts-jest',
      'jest-junit'
    ];

    console.log('Installing dependencies:', deps.join(', '));
    
    const result = spawnSync('npm', ['install', '--save-dev', ...deps], {
      stdio: 'inherit',
      shell: true
    });

    return result.status === 0;
  }

  /**
   * Configure Jest for the project
   */
  private configureJest(): boolean {
    try {
      const jestConfigPath = resolve(this.testRoot, 'jest.config.js');
      if (!existsSync(jestConfigPath)) {
        console.log('Creating Jest config:', jestConfigPath);
        writeFileSync(jestConfigPath, this.getJestConfig());
      }
      return true;
    } catch (error) {
      console.error('Failed to configure Jest:', error);
      return false;
    }
  }

  /**
   * Make test scripts executable
   */
  private makeScriptsExecutable(): boolean {
    const scripts = [
      'run-infra-tests.sh',
      'test.sh'
    ];

    try {
      scripts.forEach(script => {
        const scriptPath = resolve(this.testRoot, script);
        if (existsSync(scriptPath)) {
          spawnSync('chmod', ['+x', scriptPath], { shell: true });
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to make scripts executable:', error);
      return false;
    }
  }

  /**
   * Verify setup by running a basic test
   */
  private verifySetup(): boolean {
    console.log('Running test verification...');
    
    const result = spawnSync('npm', ['run', 'test:infra'], {
      stdio: 'inherit',
      shell: true
    });

    return result.status === 0;
  }

  /**
   * Run a setup step with error handling
   */
  private async runStep(step: SetupStep): Promise<boolean> {
    process.stdout.write(`${step.name}... `);
    
    try {
      const success = await step.action();
      console.log(success ? '✅' : '❌');
      return success;
    } catch (error) {
      console.log('❌');
      console.error(`Error in ${step.name}:`, error);
      return false;
    }
  }

  /**
   * Show next steps after setup
   */
  private showNextSteps(): void {
    console.log('Next steps:');
    console.log('1. Run all tests: npm run test:all');
    console.log('2. Check coverage: npm run test:error:coverage');
    console.log('3. Review test documentation: src/lib/testing/TEST-HELP.md');
    console.log('\nHappy testing! 🚀\n');
  }

  /**
   * Get Jest configuration
   */
  private getJestConfig(): string {
    return `/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '<rootDir>/src/lib/testing/__tests__/**/*.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/lib/testing/setup/jest.setup.ts'
  ],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage/test-infrastructure'
};`;
  }
}

// Run setup if called directly
if (require.main === module) {
  new TestEnvironmentSetup().setup()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export { TestEnvironmentSetup };