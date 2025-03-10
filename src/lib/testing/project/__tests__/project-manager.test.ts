import { TestContext } from '../../test-context';
import { ErrorTestUtils } from '../../error-test-utils';

interface Task {
  id: string;
  type: 'audio' | 'pattern' | 'validation';
  input: Record<string, unknown>;
  requirements: {
    modelType: string;
    priority: number;
  };
}

interface Model {
  id: string;
  type: string;
  status: 'ready' | 'processing' | 'error';
  resources: string[];
}

interface Resources {
  id: string;
  type: string;
  allocated: boolean;
  metrics: {
    usage: number;
    capacity: number;
  };
}

describe('Project Manager Integration', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await TestContext.create();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  describe('Task Management', () => {
    it('handles resource allocation failures', async () => {
      const task: Task = {
        id: 'task_1',
        type: 'audio',
        input: { file: 'test.wav' },
        requirements: {
          modelType: 'audio_processor',
          priority: 1
        }
      };

      try {
        await context.mockError(ErrorTestUtils.createResourceError('exhausted'));
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
      }

      // Verify resource cleanup
      const state = context.healthMonitor.getFullState();
      expect(state.metrics.lastError).toBeDefined();
    });

    it('coordinates multiple model assignments', async () => {
      const audioModel = await context.projectManager.createModel('audio');
      const patternModel = await context.projectManager.createModel('pattern');

      // Test model coordination
      try {
        await context.mockHandoffError(audioModel, patternModel);
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
        expect(context.projectManager.getModel(audioModel.id)?.status).toBe('error');
        expect(context.projectManager.getModel(patternModel.id)?.status).toBe('error');
      }
    });

    it('maintains task context through errors', async () => {
      const model = await context.projectManager.createModel('audio');
      const customError = ErrorTestUtils.createErrorWithContext(
        'Task processing error',
        {
          code: 'TASK_ERROR',
          details: {
            taskId: 'task_1',
            modelId: model.id,
            phase: 'processing'
          }
        }
      );

      try {
        await context.mockError(customError);
      } catch (error) {
        const state = context.healthMonitor.getFullState();
        expect(state.metrics.lastError).toBe(customError);
        expect((state.metrics.lastError as any)?.details?.taskId).toBe('task_1');
      }
    });

    it('recovers from validation failures', async () => {
      const models = await Promise.all([
        context.projectManager.createModel('audio'),
        context.projectManager.createModel('validator')
      ]);

      // Simulate validation failure
      try {
        await context.mockHandoffError(models[0], models[1]);
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
      }

      // System should recover
      await context.reset();
      expect(context.healthMonitor.getStatus()).toBe('healthy');

      // New models should work
      const newModel = await context.projectManager.createModel('audio');
      expect(newModel.status).toBe('ready');
    });
  });

  describe('Resource Management', () => {
    it('handles concurrent resource requests', async () => {
      const models = await Promise.all([
        context.projectManager.createModel('audio'),
        context.projectManager.createModel('pattern'),
        context.projectManager.createModel('validator')
      ]);

      // Request resources concurrently
      const errors = models.map(model => 
        context.mockError(
          ErrorTestUtils.createErrorWithContext(
            `Resource error for ${model.id}`,
            {
              code: 'RESOURCE_ERROR',
              details: { modelId: model.id }
            }
          )
        ).catch(e => e)
      );

      await Promise.all(errors);
      expect(context.healthMonitor.getStatus()).toBe('error');
      
      const state = context.healthMonitor.getFullState();
      expect(state.errorCount).toBe(3);
    });
  });
});