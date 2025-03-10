import { SequentialOrchestrator, AudioTask, ModelType } from '../sequential/orchestrator';

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  external: number;
  total: number;
}

export class MinimalTestFramework {
  private orchestrator: SequentialOrchestrator;
  private memorySnapshots: MemorySnapshot[] = [];

  constructor(memoryLimit: number = 16 * 1024 * 1024 * 1024) {
    this.orchestrator = new SequentialOrchestrator(memoryLimit);
  }

  private async takeMemorySnapshot(): Promise<MemorySnapshot> {
    const usage = process.memoryUsage();
    const snapshot = {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      external: usage.external,
      total: usage.heapUsed + usage.external
    };
    this.memorySnapshots.push(snapshot);
    return snapshot;
  }

  async modelTests() {
    const results = {
      loadUnload: await this.testLoadUnload(),
      basicProcessing: await this.testBasicProcessing(),
      memoryProfile: await this.testMemoryProfile()
    };

    return results;
  }

  async orchestrationTests() {
    const results = {
      taskPlanning: await this.testTaskPlanning(),
      modelHandoff: await this.testModelHandoff(),
      errorRecovery: await this.testErrorRecovery()
    };

    return results;
  }

  private async testLoadUnload(): Promise<boolean> {
    try {
      const initialSnapshot = await this.takeMemorySnapshot();
      
      // Test loading and unloading different sized models
      const models: ModelType[] = [
        {
          id: 'small-model',
          name: 'Small Test Model',
          memoryRequirement: 1 * 1024 * 1024 * 1024, // 1GB
          capabilities: { transcription: true }
        },
        {
          id: 'medium-model',
          name: 'Medium Test Model',
          memoryRequirement: 4 * 1024 * 1024 * 1024, // 4GB
          capabilities: { synthesis: true }
        }
      ];

      for (const model of models) {
        await this.orchestrator.loadModel(model);
        const loadedSnapshot = await this.takeMemorySnapshot();
        await this.orchestrator.unloadModel();
        const unloadedSnapshot = await this.takeMemorySnapshot();

        // Verify memory is properly freed
        const memoryDiff = unloadedSnapshot.total - initialSnapshot.total;
        if (memoryDiff > 100 * 1024 * 1024) { // Allow 100MB variance
          console.error(`Memory leak detected: ${memoryDiff / 1024 / 1024}MB not freed`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Load/Unload test failed:', error);
      return false;
    }
  }

  private async testBasicProcessing(): Promise<boolean> {
    try {
      const task: AudioTask = {
        id: 'test-task',
        type: 'transcription',
        input: new AudioBuffer({ length: 1000, sampleRate: 44100, numberOfChannels: 1 })
      };

      const result = await this.orchestrator.processTask(task);
      return result.length > 0;
    } catch (error) {
      console.error('Basic processing test failed:', error);
      return false;
    }
  }

  private async testMemoryProfile(): Promise<{passed: boolean, profile: MemorySnapshot[]}> {
    const startSnapshot = await this.takeMemorySnapshot();
    const memoryLimit = this.orchestrator.getMemoryLimit();
    
    try {
      // Process multiple tasks sequentially
      const tasks: AudioTask[] = [
        {
          id: 'task1',
          type: 'transcription',
          input: new AudioBuffer({ length: 1000, sampleRate: 44100, numberOfChannels: 1 })
        },
        {
          id: 'task2',
          type: 'synthesis',
          input: 'Test synthesis text'
        }
      ];

      for (const task of tasks) {
        await this.orchestrator.processTask(task);
        const snapshot = await this.takeMemorySnapshot();
        
        // Verify memory never exceeds limit
        if (snapshot.total > memoryLimit) {
          console.error(`Memory limit exceeded: ${snapshot.total / 1024 / 1024}MB > ${memoryLimit / 1024 / 1024}MB`);
          return { passed: false, profile: this.memorySnapshots };
        }
      }

      const endSnapshot = await this.takeMemorySnapshot();
      const memoryDiff = endSnapshot.total - startSnapshot.total;

      return {
        passed: memoryDiff < 100 * 1024 * 1024, // Allow 100MB variance
        profile: this.memorySnapshots
      };
    } catch (error) {
      console.error('Memory profile test failed:', error);
      return { passed: false, profile: this.memorySnapshots };
    }
  }

  private async testTaskPlanning(): Promise<boolean> {
    try {
      const task: AudioTask = {
        id: 'complex-task',
        type: 'analysis',
        input: new AudioBuffer({ length: 1000, sampleRate: 44100, numberOfChannels: 1 })
      };

      const plan = await this.orchestrator.planTask(task);
      return plan.length > 0 && plan.every(step => 
        step.modelType && 
        step.operation && 
        step.modelType.memoryRequirement <= this.orchestrator.getMemoryLimit()
      );
    } catch (error) {
      console.error('Task planning test failed:', error);
      return false;
    }
  }

  private async testModelHandoff(): Promise<boolean> {
    try {
      // Test sequential model transitions
      const task1: AudioTask = {
        id: 'task1',
        type: 'transcription',
        input: new AudioBuffer({ length: 1000, sampleRate: 44100, numberOfChannels: 1 })
      };

      const task2: AudioTask = {
        id: 'task2',
        type: 'synthesis',
        input: 'Test handoff'
      };

      await this.orchestrator.processTask(task1);
      await this.orchestrator.processTask(task2);

      return true;
    } catch (error) {
      console.error('Model handoff test failed:', error);
      return false;
    }
  }

  private async testErrorRecovery(): Promise<boolean> {
    try {
      // Test oversized model
      const oversizedModel: ModelType = {
        id: 'oversized',
        name: 'Oversized Model',
        memoryRequirement: 20 * 1024 * 1024 * 1024, // 20GB
        capabilities: { transcription: true }
      };

      try {
        await this.orchestrator.loadModel(oversizedModel);
        console.error('Failed: Oversized model should have been rejected');
        return false;
      } catch (error) {
        // Expected error
        const snapshot = await this.takeMemorySnapshot();
        return snapshot.total < this.orchestrator.getMemoryLimit();
      }
    } catch (error) {
      console.error('Error recovery test failed:', error);
      return false;
    }
  }

  getMemoryProfile(): MemorySnapshot[] {
    return this.memorySnapshots;
  }
}