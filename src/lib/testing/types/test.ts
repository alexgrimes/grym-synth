import { HealthState } from './health';

export interface Test {
  name: string;
  run: () => Promise<void>;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
}

export interface TestSuite {
  name: string;
  tests: Test[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: Error;
  skipped?: boolean;
  health: HealthState;
}

export interface TestRunner {
  runSuite(suite: TestSuite): Promise<TestResult[]>;
}

export interface TestConfig {
  timeout: number;
  retries: number;
  parallel: boolean;
  bail: boolean;
}

export function createDefaultTestConfig(): TestConfig {
  return {
    timeout: 5000,
    retries: 0,
    parallel: false,
    bail: false
  };
}

export function isTestResult(result: unknown): result is TestResult {
  if (!result || typeof result !== 'object') return false;
  
  const r = result as TestResult;
  return (
    typeof r.name === 'string' &&
    typeof r.success === 'boolean' &&
    typeof r.duration === 'number' &&
    (!r.error || r.error instanceof Error) &&
    (r.skipped === undefined || typeof r.skipped === 'boolean') &&
    r.health !== undefined
  );
}