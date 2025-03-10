#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { generateReport, processJestOutput } from './generate-report';

interface TaskResult {
  success: boolean;
  output: string;
}

type TaskName = 'test' | 'coverage' | 'verify' | 'report' | 'all';
type TaskFunction = () => Promise<TaskResult>;

/**
 * Run a command and capture output
 */
function runCommand(command: string, args: string[]): TaskResult {
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf-8',
    shell: true
  });

  return {
    success: result.status === 0,
    output: result.stdout || result.stderr || ''
  };
}

/**
 * Available test tasks
 */
const tasks = {
  /**
   * Run error handling tests
   */
  async test(): Promise<TaskResult> {
    console.log('\nRunning error handling tests...');
    return runCommand('npm', ['run', 'test:error']);
  },

  /**
   * Run tests with coverage
   */
  async coverage(): Promise<TaskResult> {
    console.log('\nRunning tests with coverage...');
    return runCommand('npm', ['run', 'test:error', '--', '--coverage']);
  },

  /**
   * Run verification tests
   */
  async verify(): Promise<TaskResult> {
    console.log('\nRunning verification tests...');
    return runCommand('npm', ['run', 'test:error', '--', '--testMatch', '**/verification.test.ts']);
  },

  /**
   * Generate test report
   */
  async report(): Promise<TaskResult> {
    console.log('\nGenerating test report...');
    
    // Run tests with JSON output
    const jsonPath = resolve(__dirname, 'test-output.json');
    const testResult = runCommand('npm', [
      'run',
      'test:error',
      '--',
      '--json',
      `--outputFile=${jsonPath}`
    ]);

    if (!testResult.success) {
      return testResult;
    }

    try {
      // Generate HTML report
      const htmlPath = resolve(__dirname, 'test-report.html');
      const reportData = processJestOutput(jsonPath);
      const html = generateReport(reportData);
      
      console.log(`Report generated: ${htmlPath}`);
      return { success: true, output: `Report saved to ${htmlPath}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        output: `Failed to generate report: ${errorMessage}`
      };
    }
  },

  /**
   * Run all tasks
   */
  async all(): Promise<TaskResult> {
    const results: TaskResult[] = [];
    const taskEntries = Object.entries(tasks) as [TaskName, TaskFunction][];
    
    for (const [name, task] of taskEntries) {
      if (name !== 'all') {
        console.log(`\nRunning task: ${name}`);
        results.push(await task());
      }
    }

    const success = results.every(r => r.success);
    const output = results
      .map((r, i) => `Task ${Object.keys(tasks)[i]}: ${r.success ? 'Success' : 'Failed'}`)
      .join('\n');

    return { success, output };
  }
} satisfies Record<TaskName, TaskFunction>;

// Run tasks if called directly
if (require.main === module) {
  const taskName = process.argv[2] as TaskName || 'test';
  
  if (!Object.prototype.hasOwnProperty.call(tasks, taskName)) {
    console.error(`Unknown task: ${taskName}`);
    console.log('Available tasks:', Object.keys(tasks).join(', '));
    process.exit(1);
  }

  tasks[taskName]().then((result: TaskResult) => {
    if (!result.success) {
      console.error('Task failed:', result.output);
      process.exit(1);
    }
    console.log(result.output);
  }).catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Task failed:', errorMessage);
    process.exit(1);
  });
}

export { tasks, TaskResult, TaskName, TaskFunction };