import { SequentialOrchestrator } from '../sequential/orchestrator';
import { MemoryProfiler } from './memory-profile';
import { MemoryVisualizer } from './memory-viz';
import * as path from 'path';

const MEMORY_LIMIT = 16 * 1024 * 1024 * 1024; // 16GB
const REPORTS_DIR = path.join(__dirname, '../../../reports/memory');

interface TestScenario {
  name: string;
  run: (orchestrator: SequentialOrchestrator, profiler: MemoryProfiler) => Promise<void>;
}

async function runMemoryTests() {
  const orchestrator = new SequentialOrchestrator(MEMORY_LIMIT);
  const profiler = new MemoryProfiler(MEMORY_LIMIT);
  const visualizer = new MemoryVisualizer();

  const scenarios: TestScenario[] = [
    {
      name: 'Sequential Model Loading',
      run: async (orchestrator, profiler) => {
        const models = [
          {
            id: 'small-model',
            name: 'Small Audio Model',
            memoryRequirement: 2 * 1024 * 1024 * 1024, // 2GB
            capabilities: { transcription: true }
          },
          {
            id: 'medium-model',
            name: 'Medium Audio Model',
            memoryRequirement: 4 * 1024 * 1024 * 1024, // 4GB
            capabilities: { synthesis: true }
          },
          {
            id: 'large-model',
            name: 'Large Audio Model',
            memoryRequirement: 8 * 1024 * 1024 * 1024, // 8GB
            capabilities: { streaming: true }
          }
        ];

        for (const model of models) {
          await profiler.takeSnapshot(`before_${model.id}`);
          visualizer.track(await profiler.getActualMemoryUsage());
          
          await orchestrator.loadModel(model);
          await profiler.takeSnapshot(`loaded_${model.id}`);
          visualizer.track(
            await profiler.getActualMemoryUsage(),
            { type: 'load', model: model.id, timestamp: Date.now() }
          );
          
          await orchestrator.unloadModel();
          await profiler.takeSnapshot(`unloaded_${model.id}`);
          visualizer.track(
            await profiler.getActualMemoryUsage(),
            { type: 'unload', model: model.id, timestamp: Date.now() }
          );
        }
      }
    },
    {
      name: 'Concurrent Task Processing',
      run: async (orchestrator, profiler) => {
        const model = {
          id: 'test-model',
          name: 'Test Model',
          memoryRequirement: 4 * 1024 * 1024 * 1024,
          capabilities: { transcription: true, synthesis: true }
        };

        await profiler.takeSnapshot('before_tasks');
        visualizer.track(await profiler.getActualMemoryUsage());

        await orchestrator.loadModel(model);
        visualizer.track(
          await profiler.getActualMemoryUsage(),
          { type: 'load', model: model.id, timestamp: Date.now() }
        );

        const tasks = Array(5).fill(null).map((_, i) => ({
          id: `task-${i}`,
          type: 'transcription' as const,
          input: new AudioBuffer({
            length: 48000, // 1 second at 48kHz
            numberOfChannels: 2,
            sampleRate: 48000
          })
        }));

        await profiler.takeSnapshot('tasks_start');
        for (const task of tasks) {
          await orchestrator.processTask(task);
          await profiler.takeSnapshot(`task_${task.id}`);
          visualizer.track(await profiler.getActualMemoryUsage());
        }
        await profiler.takeSnapshot('tasks_end');

        await orchestrator.unloadModel();
        visualizer.track(
          await profiler.getActualMemoryUsage(),
          { type: 'unload', model: model.id, timestamp: Date.now() }
        );
      }
    }
  ];

  console.log('Starting memory tests...\n');

  for (const scenario of scenarios) {
    console.log(`Running scenario: ${scenario.name}`);
    profiler.startTracking();
    
    try {
      await scenario.run(orchestrator, profiler);
      console.log(`✓ ${scenario.name} completed`);
      
      const memoryReport = profiler.generateReport();
      console.log('\nMemory Report:');
      console.log(memoryReport);
    } catch (error) {
      console.error(`✗ ${scenario.name} failed:`, error);
    } finally {
      profiler.stopTracking();
    }

    console.log('\n---\n');
  }

  // Generate visual report
  const reportPath = path.join(REPORTS_DIR, 'memory-usage.html');
  await visualizer.generateReport(reportPath, MEMORY_LIMIT);
  console.log(`Memory visualization report generated at: ${reportPath}`);
}

// Run tests if executed directly
if (require.main === module) {
  runMemoryTests().catch(error => {
    console.error('Memory tests failed:', error);
    process.exit(1);
  });
}

export { runMemoryTests };