import { TestContext } from './test-context';
import { HealthState, ResourceMetrics } from '../types';

interface SystemState {
  resourceState: {
    poolSize: number;
    availableResources: number;
    errorCount: number;
  };
  healthState: {
    status: HealthState;
    lastError?: Error;
  };
}

interface VerificationOptions {
  checkHealth?: boolean;
  checkResources?: boolean;
  allowErrors?: boolean;
}

export class TestLifecycleManager {
  private context?: TestContext;
  private initialState?: SystemState;

  async beforeAll(): Promise<void> {
    this.initialState = await this.captureSystemState();
  }

  async afterAll(): Promise<void> {
    if (this.initialState) {
      await this.restoreSystemState(this.initialState);
    }
    await this.cleanupResources();
  }

  async beforeEach(): Promise<TestContext> {
    this.context = await TestContext.create();
    await this.resetState();
    return this.context;
  }

  async afterEach(): Promise<void> {
    if (!this.context) {
      return;
    }
    await this.context.cleanup();
    await this.verifyCleanState();
  }

  async resetState(): Promise<void> {
    if (!this.context) {
      throw new Error('Test context not initialized');
    }

    await Promise.all([
      this.context.resourcePool.reset(),
      this.context.healthMonitor.reset()
    ]);

    await this.verifyCleanState();
  }

  async mockSystemState(state: SystemState): Promise<void> {
    if (!this.context) {
      throw new Error('Test context not initialized');
    }

    const { resourceState } = state;
    await this.context.resourcePool.mockCleanup(
      resourceState.poolSize - resourceState.availableResources
    );

    const { healthState } = state;
    this.context.healthMonitor.mockState(healthState.status);
    if (healthState.lastError) {
      await this.context.mockError(healthState.lastError);
    }
  }

  private async captureSystemState(): Promise<SystemState> {
    if (!this.context) {
      throw new Error('Test context not initialized');
    }

    const metrics = this.context.resourcePool.getMetrics();
    
    return {
      resourceState: {
        poolSize: metrics.poolSize,
        availableResources: metrics.available,
        errorCount: 0
      },
      healthState: {
        status: this.context.healthMonitor.getStatus()
      }
    };
  }

  private async restoreSystemState(state: SystemState): Promise<void> {
    await this.mockSystemState(state);
    await this.verifyState(state);
  }

  private async verifyState(
    expected: SystemState,
    options: VerificationOptions = {}
  ): Promise<void> {
    if (!this.context) {
      throw new Error('Test context not initialized');
    }

    const actual = await this.captureSystemState();

    if (options.checkResources !== false) {
      this.verifyResourceState(actual.resourceState, expected.resourceState);
    }

    if (options.checkHealth !== false) {
      this.verifyHealthState(actual.healthState, expected.healthState);
    }
  }

  private verifyResourceState(
    actual: SystemState['resourceState'],
    expected: SystemState['resourceState']
  ): void {
    if (actual.poolSize !== expected.poolSize) {
      throw new Error(
        `Pool size mismatch. Expected: ${expected.poolSize}, Got: ${actual.poolSize}`
      );
    }

    if (actual.availableResources !== expected.availableResources) {
      throw new Error(
        `Available resources mismatch. Expected: ${expected.availableResources}, Got: ${actual.availableResources}`
      );
    }
  }

  private verifyHealthState(
    actual: SystemState['healthState'],
    expected: SystemState['healthState']
  ): void {
    if (actual.status !== expected.status) {
      throw new Error(
        `Health status mismatch. Expected: ${expected.status}, Got: ${actual.status}`
      );
    }
  }

  private async verifyCleanState(): Promise<void> {
    if (!this.context) {
      throw new Error('Test context not initialized');
    }

    await this.context.verifyCleanState();
  }

  private async cleanupResources(): Promise<void> {
    if (this.context) {
      await this.context.cleanup();
      this.context = undefined;
    }
  }
}