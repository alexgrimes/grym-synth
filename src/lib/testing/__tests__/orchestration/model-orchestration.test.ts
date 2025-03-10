import { TestContext } from '../../test-context';
import { ErrorTestUtils } from '../../error-test-utils';

describe('Model Orchestration', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await TestContext.create();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  describe('Model Handoff', () => {
    it('handles errors during model handoff', async () => {
      const sourceModel = await context.projectManager.createModel('audio');
      const targetModel = await context.projectManager.createModel('pattern');

      expect.assertions(4);
      
      try {
        await context.mockHandoffError(sourceModel, targetModel);
      } catch (error) {
        expect(error).toBeDefined();
        expect(context.healthMonitor.getStatus()).toBe('warning');
        expect(context.projectManager.getModel(sourceModel.id)?.status).toBe('error');
        expect(context.projectManager.getModel(targetModel.id)?.status).toBe('error');
      }
    });

    it('maintains health state across multiple handoffs', async () => {
      const models = await Promise.all([
        context.projectManager.createModel('audio'),
        context.projectManager.createModel('pattern'),
        context.projectManager.createModel('classifier')
      ]);

      // First handoff fails
      try {
        await context.mockHandoffError(models[0], models[1]);
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
      }

      // Second handoff fails - should escalate health state
      try {
        await context.mockHandoffError(models[1], models[2]);
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('error');
      }
    });

    it('tracks errors per model', async () => {
      const sourceModel = await context.projectManager.createModel('audio');
      const targetModel = await context.projectManager.createModel('pattern');

      try {
        await context.mockHandoffError(sourceModel, targetModel);
      } catch (error) {
        const state = context.healthMonitor.getFullState();
        expect(state.errorCount).toBe(1);
        expect(state.metrics.lastError).toBeDefined();
        if (state.metrics.lastError) {
          expect((state.metrics.lastError as any).source).toBe(sourceModel.id);
          expect((state.metrics.lastError as any).target).toBe(targetModel.id);
        }
      }
    });
  });

  describe('Error Recovery', () => {
    it('recovers model state after errors', async () => {
      const model = await context.projectManager.createModel('audio');
      
      try {
        await context.mockError(ErrorTestUtils.createResourceError('exhausted'));
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
        expect(context.projectManager.getModel(model.id)?.status).toBe('error');
      }

      await context.reset();
      const resetModel = context.projectManager.getModel(model.id);
      expect(resetModel).toBeUndefined(); // Model should be cleared on reset
      expect(context.healthMonitor.getStatus()).toBe('healthy');
    });

    it('handles concurrent model errors', async () => {
      const models = await Promise.all([
        context.projectManager.createModel('audio'),
        context.projectManager.createModel('pattern'),
        context.projectManager.createModel('classifier')
      ]);

      const errors = models.map(model => 
        context.mockError(
          ErrorTestUtils.createErrorWithContext(
            `Error in model ${model.id}`,
            {
              code: 'MODEL_ERROR',
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