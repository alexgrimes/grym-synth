import { TestContext } from '../../test-context';
import { ErrorTestUtils } from '../../error-test-utils';

describe('Model Verification', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await TestContext.create();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  describe('Coordinated Verification', () => {
    it('verifies work between models', async () => {
      const sourceModel = await context.projectManager.createModel('audio');
      const targetModel = await context.projectManager.createModel('pattern');

      // Both models should start in ready state
      expect(sourceModel.status).toBe('ready');
      expect(targetModel.status).toBe('ready');

      // Put models into processing state
      context.projectManager.setModelStatus(sourceModel.id, 'processing');
      context.projectManager.setModelStatus(targetModel.id, 'processing');

      expect(sourceModel.status).toBe('processing');
      expect(targetModel.status).toBe('processing');
    });

    it('handles verification failures', async () => {
      const sourceModel = await context.projectManager.createModel('audio');
      const targetModel = await context.projectManager.createModel('pattern');

      try {
        await context.mockHandoffError(sourceModel, targetModel);
      } catch (error) {
        // Both models should be in error state
        const updatedSource = context.projectManager.getModel(sourceModel.id);
        const updatedTarget = context.projectManager.getModel(targetModel.id);

        expect(updatedSource?.status).toBe('error');
        expect(updatedTarget?.status).toBe('error');
        expect(context.healthMonitor.getStatus()).toBe('warning');
      }
    });

    it('maintains model state consistency', async () => {
      const models = await Promise.all([
        context.projectManager.createModel('audio'),
        context.projectManager.createModel('pattern'),
        context.projectManager.createModel('classifier')
      ]);

      // Simulate cascading failures
      for (let i = 0; i < models.length - 1; i++) {
        try {
          await context.mockHandoffError(models[i], models[i + 1]);
        } catch (error) {
          // Expected errors
        }
      }

      // All models should be in error state
      models.forEach(model => {
        const updatedModel = context.projectManager.getModel(model.id);
        expect(updatedModel?.status).toBe('error');
      });

      // System health should reflect multiple failures
      expect(context.healthMonitor.getStatus()).toBe('error');

      // Reset should clear all models
      await context.reset();
      models.forEach(model => {
        const resetModel = context.projectManager.getModel(model.id);
        expect(resetModel).toBeUndefined();
      });
    });

    it('tracks verification metrics', async () => {
      const models = await Promise.all([
        context.projectManager.createModel('audio'),
        context.projectManager.createModel('pattern')
      ]);

      try {
        await context.mockHandoffError(models[0], models[1]);
      } catch (error) {
        const state = context.healthMonitor.getFullState();
        expect(state.errorCount).toBeGreaterThan(0);
        expect(state.metrics.lastError).toBeDefined();
      }
    });
  });

  describe('Recovery Scenarios', () => {
    it('recovers from partial verification failures', async () => {
      const audioModel = await context.projectManager.createModel('audio');
      const patternModel = await context.projectManager.createModel('pattern');
      const classifierModel = await context.projectManager.createModel('classifier');

      // First handoff fails
      try {
        await context.mockHandoffError(audioModel, patternModel);
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
      }

      // System should still allow operations on unaffected models
      expect(context.projectManager.getModel(classifierModel.id)?.status)
        .toBe('ready');

      // Reset affected models
      await context.reset();
      expect(context.healthMonitor.getStatus()).toBe('healthy');
    });
  });
});