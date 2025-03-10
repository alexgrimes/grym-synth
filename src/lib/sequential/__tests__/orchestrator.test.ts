import { SequentialOrchestrator, AudioTask, ModelType } from '../orchestrator';
import { testEnv } from '../../testing/jest.setup';
import { createTestAudioBuffer } from '../../testing/test-setup/browser-mocks';

describe('Sequential Orchestrator Memory Tests', () => {
  let orchestrator: SequentialOrchestrator;
  
  beforeEach(async () => {
    orchestrator = new SequentialOrchestrator(testEnv.MEMORY_LIMIT);
  });

  afterEach(async () => {
    await orchestrator.unloadModel();
  });

  it('should respect memory limits when loading models', async () => {
    const models: ModelType[] = [
      {
        id: 'small',
        name: 'Small Model',
        memoryRequirement: 2 * 1024 * 1024 * 1024, // 2GB
        capabilities: { transcription: true }
      },
      {
        id: 'medium',
        name: 'Medium Model',
        memoryRequirement: 8 * 1024 * 1024 * 1024, // 8GB
        capabilities: { synthesis: true }
      }
    ];

    for (const model of models) {
      const beforeLoad = await testEnv.memoryProfiler.getActualMemoryUsage();
      await testEnv.memoryProfiler.takeSnapshot(`before_${model.id}`);
      
      await orchestrator.loadModel(model);
      const afterLoad = await testEnv.memoryProfiler.getActualMemoryUsage();
      
      // Verify memory usage is within limits
      expect(afterLoad.heap + afterLoad.external).toBeWithinMemoryLimit(testEnv.MEMORY_LIMIT);
      
      // Verify model memory usage
      const memoryUsed = afterLoad.heap - beforeLoad.heap;
      expect(memoryUsed).toBeLessThan(model.memoryRequirement);
      
      await orchestrator.unloadModel();
      await testEnv.forceGC();
      
      const afterUnload = await testEnv.memoryProfiler.getActualMemoryUsage();
      const retainedMemory = afterUnload.heap - beforeLoad.heap;
      expect(retainedMemory).toBeLessThan(50 * 1024 * 1024); // Less than 50MB retained
    }
  });

  it('should handle sequential task processing', async () => {
    const model: ModelType = {
      id: 'test-model',
      name: 'Test Model',
      memoryRequirement: 4 * 1024 * 1024 * 1024, // 4GB
      capabilities: { transcription: true }
    };

    await orchestrator.loadModel(model);

    const task: AudioTask = {
      id: 'test-task',
      type: 'transcription',
      input: createTestAudioBuffer(1.0) // 1 second audio buffer
    };

    const initialSnapshot = await testEnv.memoryProfiler.getActualMemoryUsage();

    for (let i = 0; i < 5; i++) {
      const beforeTask = await testEnv.memoryProfiler.getActualMemoryUsage();
      await orchestrator.processTask(task);
      const afterTask = await testEnv.memoryProfiler.getActualMemoryUsage();
      
      const taskMemoryUsage = afterTask.heap - beforeTask.heap;
      expect(taskMemoryUsage).toBeLessThan(1 * 1024 * 1024 * 1024); // Less than 1GB per task
    }

    const finalSnapshot = await testEnv.memoryProfiler.getActualMemoryUsage();
    expect(finalSnapshot.heap).toHaveAcceptableMemoryGrowth(initialSnapshot.heap, 0.2);
  });

  it('should reject oversized models', async () => {
    const oversizedModel: ModelType = {
      id: 'huge',
      name: 'Huge Model',
      memoryRequirement: 20 * 1024 * 1024 * 1024, // 20GB
      capabilities: { transcription: true }
    };

    await expect(orchestrator.loadModel(oversizedModel))
      .rejects.toThrow(/Insufficient memory/);
    
    const snapshot = await testEnv.memoryProfiler.getActualMemoryUsage();
    expect(snapshot.heap + snapshot.external).toBeLessThan(testEnv.MEMORY_LIMIT);
  });

  it('should maintain stable memory during transitions', async () => {
    const initialSnapshot = await testEnv.memoryProfiler.getActualMemoryUsage();
    
    const models: ModelType[] = [
      {
        id: 'model-a',
        name: 'Model A',
        memoryRequirement: 2 * 1024 * 1024 * 1024,
        capabilities: { transcription: true }
      },
      {
        id: 'model-b',
        name: 'Model B',
        memoryRequirement: 4 * 1024 * 1024 * 1024,
        capabilities: { synthesis: true }
      }
    ];

    for (const model of models) {
      await testEnv.memoryProfiler.takeSnapshot(`before_${model.id}`);
      await orchestrator.loadModel(model);
      await testEnv.memoryProfiler.takeSnapshot(`loaded_${model.id}`);
      await orchestrator.unloadModel();
      await testEnv.memoryProfiler.takeSnapshot(`unloaded_${model.id}`);
      await testEnv.forceGC();
    }

    const finalSnapshot = await testEnv.memoryProfiler.getActualMemoryUsage();
    expect(finalSnapshot.heap).toHaveAcceptableMemoryGrowth(initialSnapshot.heap, 0.1);
  });
});