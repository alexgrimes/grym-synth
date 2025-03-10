import { HealthState } from '../types';

interface TestModel {
  id: string;
  type: string;
  status: 'ready' | 'processing' | 'error';
}

interface TestResourcePool {
  mockError(error: Error): Promise<void>;
  mockAllocation(resourceId: string): Promise<void>;
  mockHandoffError(source: TestModel, target: TestModel): Promise<void>;
  getMetrics(): { poolSize: number; available: number; lastError: Error | null };
  reset(): Promise<void>;
  mockCleanup(count: number): Promise<void>;
}

interface TestHealthMonitor {
  getStatus(): HealthState;
  getFullState(): {
    health: HealthState;
    errorCount: number;
    metrics: {
      requestCount: number;
      errorRate: number;
      lastError: Error | null;
    };
    status: string;
    lastCheck: Date;
  };
  handleError(error: Error): void;
  reset(): void;
}

class TestProjectManager {
  private models: Map<string, TestModel> = new Map();
  private activeModel: TestModel | null = null;

  async createModel(type: string): Promise<TestModel> {
    const id = `${type}_${Date.now()}`;
    const model: TestModel = {
      id,
      type,
      status: 'ready'
    };
    this.models.set(id, model);
    this.activeModel = model;
    return model;
  }

  getModel(id: string): TestModel | undefined {
    return this.models.get(id);
  }

  setModelStatus(id: string, status: TestModel['status']): void {
    const model = this.models.get(id);
    if (model) {
      model.status = status;
    }
  }

  getActiveModel(): TestModel | null {
    return this.activeModel;
  }

  clear(): void {
    this.models.clear();
    this.activeModel = null;
  }
}

export class TestContext {
  public readonly projectManager: TestProjectManager;

  constructor(
    public readonly resourcePool: TestResourcePool,
    public readonly healthMonitor: TestHealthMonitor
  ) {
    this.projectManager = new TestProjectManager();
  }

  static async create(): Promise<TestContext> {
    let lastError: Error | null = null;
    
    const resourcePool: TestResourcePool = {
      async mockError(error: Error) {
        throw error;
      },
      async mockAllocation(resourceId: string) {
        await Promise.resolve();
      },
      async mockHandoffError(source: TestModel, target: TestModel) {
        const error = new Error(
          `Handoff failed from ${source.type} to ${target.type}`
        );
        (error as any).code = 'HANDOFF_ERROR';
        (error as any).source = source.id;
        (error as any).target = target.id;
        throw error;
      },
      getMetrics() {
        return { poolSize: 10, available: 10, lastError };
      },
      async reset() {
        await Promise.resolve();
      },
      async mockCleanup(count: number) {
        await Promise.resolve();
      }
    };

    let currentHealth: HealthState = 'healthy';
    let errorCount = 0;
    let lastMetricsError: Error | null = null;
    
    const healthMonitor: TestHealthMonitor = {
      getStatus() {
        return currentHealth;
      },
      getFullState() {
        return {
          health: currentHealth,
          errorCount,
          metrics: {
            requestCount: 0,
            errorRate: 0,
            lastError: lastMetricsError
          },
          status: currentHealth,
          lastCheck: new Date()
        };
      },
      handleError(error: Error) {
        lastMetricsError = error;
        errorCount++;
        if (errorCount > 1) {
          currentHealth = 'error';
        } else {
          currentHealth = 'warning';
        }
      },
      reset() {
        currentHealth = 'healthy';
        errorCount = 0;
        lastMetricsError = null;
      }
    };

    return new TestContext(resourcePool, healthMonitor);
  }

  async mockError(error: Error): Promise<void> {
    this.healthMonitor.handleError(error);
    
    // Update model status based on error type
    const activeModel = this.projectManager.getActiveModel();
    if (activeModel) {
      if ((error as any).code === 'VALIDATION_ERROR') {
        // For validation errors, set both the active model and related models to error
        const details = (error as any).details;
        if (details?.modelId) {
          this.projectManager.setModelStatus(details.modelId, 'error');
        }
        if (details?.verifierId) {
          this.projectManager.setModelStatus(details.verifierId, 'error');
        }
      }
      // Always set active model to error state
      this.projectManager.setModelStatus(activeModel.id, 'error');
    }

    try {
      await this.resourcePool.mockError(error);
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Unknown error occurred');
    }
  }

  async mockHandoffError(source: TestModel, target: TestModel): Promise<void> {
    try {
      await this.resourcePool.mockHandoffError(source, target);
    } catch (err) {
      if (err instanceof Error) {
        this.healthMonitor.handleError(err);
        this.projectManager.setModelStatus(source.id, 'error');
        this.projectManager.setModelStatus(target.id, 'error');
        throw err;
      }
      throw new Error('Unknown error occurred during handoff');
    }
  }

  getState(): HealthState {
    return this.healthMonitor.getStatus();
  }

  getFullState() {
    return this.healthMonitor.getFullState();
  }

  async reset(): Promise<void> {
    this.healthMonitor.reset();
    await this.resourcePool.reset();
    this.projectManager.clear();
  }

  async cleanup(): Promise<void> {
    await this.reset();
  }
}