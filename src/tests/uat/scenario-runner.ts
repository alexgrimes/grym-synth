/**
 * UAT Scenario Runner
 *
 * Engine for running predefined user scenarios
 */
import { Logger } from '../../utils/logger';
import { systemBootstrap } from '../../services/integration';

// Define scenario step
export interface ScenarioStep {
  // Step name
  name: string;

  // Step description
  description: string;

  // Function to execute the step
  execute: () => Promise<StepResult>;

  // Expected result
  expectedResult: string;

  // Timeout in milliseconds
  timeoutMs?: number;

  // Whether this step is critical (failure stops scenario)
  critical?: boolean;
}

// Define step result
export interface StepResult {
  // Whether the step succeeded
  success: boolean;

  // Result data
  data?: any;

  // Error if step failed
  error?: Error;

  // Duration in milliseconds
  durationMs: number;

  // Additional notes
  notes?: string[];
}

// Define scenario
export interface Scenario {
  // Scenario ID
  id: string;

  // Scenario name
  name: string;

  // Scenario description
  description: string;

  // Scenario steps
  steps: ScenarioStep[];

  // Setup function
  setup?: () => Promise<void>;

  // Teardown function
  teardown?: () => Promise<void>;

  // Tags for categorization
  tags?: string[];

  // Expected duration in milliseconds
  expectedDurationMs?: number;
}

// Define scenario result
export interface ScenarioResult {
  // Scenario ID
  scenarioId: string;

  // Scenario name
  scenarioName: string;

  // Whether the scenario succeeded
  success: boolean;

  // Step results
  stepResults: {
    name: string;
    success: boolean;
    durationMs: number;
    error?: string;
    notes?: string[];
  }[];

  // Total duration in milliseconds
  totalDurationMs: number;

  // Start time
  startTime: Date;

  // End time
  endTime: Date;

  // Error if scenario failed
  error?: Error;

  // Additional notes
  notes?: string[];
}

export class ScenarioRunner {
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ namespace: 'scenario-runner' });

    // Bootstrap system
    systemBootstrap();
  }

  /**
   * Run a scenario
   */
  async runScenario(scenario: Scenario): Promise<ScenarioResult> {
    this.logger.info(`Starting scenario: ${scenario.name}`, {
      id: scenario.id,
      steps: scenario.steps.length
    });

    const startTime = new Date();
    const stepResults: ScenarioResult['stepResults'] = [];
    let success = true;
    let error: Error | undefined;

    try {
      // Run setup if defined
      if (scenario.setup) {
        this.logger.debug(`Running setup for scenario: ${scenario.name}`);
        await scenario.setup();
      }

      // Run steps
      for (const step of scenario.steps) {
        this.logger.debug(`Running step: ${step.name}`);

        try {
          // Execute step with timeout
          const timeoutMs = step.timeoutMs || 30000; // Default 30 seconds
          const stepStartTime = Date.now();

          const stepResult = await this.executeStepWithTimeout(step, timeoutMs);
          const stepDurationMs = Date.now() - stepStartTime;

          // Record step result
          stepResults.push({
            name: step.name,
            success: stepResult.success,
            durationMs: stepDurationMs,
            error: stepResult.error?.message,
            notes: stepResult.notes
          });

          // Log step result
          if (stepResult.success) {
            this.logger.debug(`Step succeeded: ${step.name}`, {
              durationMs: stepDurationMs
            });
          } else {
            this.logger.warn(`Step failed: ${step.name}`, {
              error: stepResult.error,
              durationMs: stepDurationMs
            });

            // If step is critical, fail the scenario
            if (step.critical) {
              success = false;
              error = stepResult.error;
              this.logger.error(`Critical step failed, aborting scenario: ${scenario.name}`);
              break;
            }
          }
        } catch (stepError) {
          // Handle step execution error
          const stepDurationMs = 0; // Unknown duration

          stepResults.push({
            name: step.name,
            success: false,
            durationMs: stepDurationMs,
            error: stepError instanceof Error ? stepError.message : String(stepError)
          });

          this.logger.error(`Step execution error: ${step.name}`, {
            error: stepError
          });

          // If step is critical, fail the scenario
          if (step.critical) {
            success = false;
            error = stepError instanceof Error ? stepError : new Error(String(stepError));
            this.logger.error(`Critical step failed, aborting scenario: ${scenario.name}`);
            break;
          }
        }
      }

      // Run teardown if defined
      if (scenario.teardown) {
        this.logger.debug(`Running teardown for scenario: ${scenario.name}`);
        await scenario.teardown();
      }
    } catch (scenarioError) {
      // Handle scenario execution error
      success = false;
      error = scenarioError instanceof Error ? scenarioError : new Error(String(scenarioError));

      this.logger.error(`Scenario execution error: ${scenario.name}`, {
        error: scenarioError
      });
    }

    const endTime = new Date();
    const totalDurationMs = endTime.getTime() - startTime.getTime();

    // Create scenario result
    const result: ScenarioResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      success,
      stepResults,
      totalDurationMs,
      startTime,
      endTime,
      error
    };

    // Log scenario result
    if (success) {
      this.logger.info(`Scenario succeeded: ${scenario.name}`, {
        totalDurationMs,
        steps: stepResults.length
      });
    } else {
      this.logger.warn(`Scenario failed: ${scenario.name}`, {
        totalDurationMs,
        steps: stepResults.length,
        error
      });
    }

    return result;
  }

  /**
   * Run multiple scenarios
   */
  async runScenarios(scenarios: Scenario[]): Promise<ScenarioResult[]> {
    this.logger.info(`Running ${scenarios.length} scenarios`);

    const results: ScenarioResult[] = [];

    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario);
      results.push(result);
    }

    // Log summary
    const successCount = results.filter(result => result.success).length;
    const failureCount = results.length - successCount;

    this.logger.info(`Completed ${results.length} scenarios`, {
      success: successCount,
      failure: failureCount,
      successRate: `${((successCount / results.length) * 100).toFixed(2)}%`
    });

    return results;
  }

  /**
   * Execute a step with timeout
   */
  private async executeStepWithTimeout(
    step: ScenarioStep,
    timeoutMs: number
  ): Promise<StepResult> {
    return new Promise<StepResult>((resolve) => {
      // Create timeout
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: new Error(`Step timed out after ${timeoutMs}ms`),
          durationMs: timeoutMs,
          notes: ['Execution timed out']
        });
      }, timeoutMs);

      // Execute step
      step.execute()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            durationMs: 0, // Unknown duration
            notes: ['Execution threw an error']
          });
        });
    });
  }

  /**
   * Load scenarios from a directory
   */
  async loadScenarios(directory: string): Promise<Scenario[]> {
    // This would typically load scenario definitions from files
    // For simplicity, we're returning an empty array
    this.logger.info(`Loading scenarios from directory: ${directory}`);
    return [];
  }
}
