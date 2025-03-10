import { FeatureMemorySystem } from './feature-memory-system';
import { ModelHealthMonitor } from './model-health-monitor';

interface Model {
  id: string;
  type: 'processing' | 'analysis';
  memoryRequirement?: number;
  status: 'inactive' | 'active' | 'busy';
}

interface HandoffOptions {
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
}

/**
 * ProjectManager handles model orchestration and coordinates with health monitoring
 * to ensure safe and efficient model handoffs.
 */
export class ProjectManager {
  private models: Map<string, Model> = new Map();
  private activeHandoffs: Set<string> = new Set();

  constructor(
    private memorySystem: FeatureMemorySystem,
    private healthMonitor: ModelHealthMonitor
  ) {}

  /**
   * Initialize a new model
   */
  async initializeModel(
    id: string,
    config: { type: Model['type']; memoryRequirement?: number }
  ): Promise<Model> {
    const health = await this.healthMonitor.checkModelHealth();
    
    // Verify we have capacity for new model
    if (!health.canAcceptTasks) {
      throw new Error('Cannot initialize model: insufficient resources');
    }

    const model: Model = {
      id,
      type: config.type,
      memoryRequirement: config.memoryRequirement,
      status: 'inactive'
    };

    this.models.set(id, model);
    return model;
  }

  /**
   * Get a model by ID
   */
  async getModel(id: string): Promise<Model> {
    const model = this.models.get(id);
    if (!model) {
      throw new Error(`Model ${id} not found`);
    }
    return model;
  }

  /**
   * Activate a model for use
   */
  async activateModel(model: Model): Promise<void> {
    const health = await this.healthMonitor.checkModelHealth();

    // Check if we have resources to activate
    if (model.memoryRequirement && 
        model.memoryRequirement > health.resources.memoryAvailable) {
      throw new Error('Insufficient memory to activate model');
    }

    if (health.resources.activeModels >= 3) {
      throw new Error('Maximum number of active models reached');
    }

    const currentModel = await this.getModel(model.id);
    currentModel.status = 'active';
    this.models.set(model.id, currentModel);
  }

  /**
   * Deactivate a model
   */
  async deactivateModel(model: Model): Promise<void> {
    const currentModel = await this.getModel(model.id);
    
    if (currentModel.status === 'busy') {
      throw new Error('Cannot deactivate busy model');
    }

    currentModel.status = 'inactive';
    this.models.set(model.id, currentModel);
  }

  /**
   * Destroy a model and free resources
   */
  async destroyModel(model: Model): Promise<void> {
    const currentModel = await this.getModel(model.id);
    
    if (currentModel.status !== 'inactive') {
      await this.deactivateModel(currentModel);
    }

    this.models.delete(model.id);
  }

  /**
   * Handle model handoff for processing
   */
  async handoff(
    sourceModel: Model,
    targetModel: Model,
    options: HandoffOptions = {}
  ): Promise<void> {
    const health = await this.healthMonitor.checkModelHealth();

    // Verify system can handle handoff
    if (!health.canAcceptTasks) {
      throw new Error('Insufficient resources');
    }

    if (health.orchestration.queueDepth >= 5) {
      throw new Error('Maximum queue depth reached');
    }

    // Generate handoff ID
    const handoffId = `${sourceModel.id}-${targetModel.id}-${Date.now()}`;
    this.activeHandoffs.add(handoffId);

    try {
      // Update model statuses
      sourceModel.status = 'busy';
      targetModel.status = 'busy';
      this.models.set(sourceModel.id, sourceModel);
      this.models.set(targetModel.id, targetModel);

      // Simulate handoff processing
      await new Promise(resolve => 
        setTimeout(resolve, options.priority === 'high' ? 1000 : 2000));

      // Reset model statuses
      sourceModel.status = 'active';
      targetModel.status = 'active';
      this.models.set(sourceModel.id, sourceModel);
      this.models.set(targetModel.id, targetModel);
    } finally {
      this.activeHandoffs.delete(handoffId);
    }
  }

  /**
   * Get current number of active handoffs
   */
  getActiveHandoffCount(): number {
    return this.activeHandoffs.size;
  }
}