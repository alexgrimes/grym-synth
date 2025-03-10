import { TestContext } from '../../test-context';
import { ErrorTestUtils } from '../../error-test-utils';

describe('Audio Project Flow Integration', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await TestContext.create();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  describe('Task Processing Flow', () => {
    it('handles complete audio task flow', async () => {
      const audioModel = await context.projectManager.createModel('audio');
      const patternModel = await context.projectManager.createModel('pattern');
      const verifierModel = await context.projectManager.createModel('verifier');

      // All models should start ready
      [audioModel, patternModel, verifierModel].forEach(model => {
        expect(context.projectManager.getModel(model.id)?.status).toBe('ready');
      });

      // Test successful processing
      expect(context.healthMonitor.getStatus()).toBe('healthy');
    });

    it('maintains task context through pipeline', async () => {
      const models = await Promise.all([
        context.projectManager.createModel('audio'),
        context.projectManager.createModel('pattern'),
        context.projectManager.createModel('verifier')
      ]);

      // Fail in middle of pipeline
      try {
        await context.mockHandoffError(models[0], models[1]);
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
        expect(context.projectManager.getModel(models[0].id)?.status).toBe('error');
        expect(context.projectManager.getModel(models[1].id)?.status).toBe('error');
        // Last model should be unaffected
        expect(context.projectManager.getModel(models[2].id)?.status).toBe('ready');
      }
    });

    it('handles concurrent task processing', async () => {
      const audioModels = await Promise.all([
        context.projectManager.createModel('audio_1'),
        context.projectManager.createModel('audio_2')
      ]);

      const patternModel = await context.projectManager.createModel('pattern');

      // Mock concurrent processing errors
      const errors = audioModels.map(model =>
        context.mockHandoffError(model, patternModel).catch(e => e)
      );

      await Promise.all(errors);

      expect(context.healthMonitor.getStatus()).toBe('error');
      expect(context.projectManager.getModel(patternModel.id)?.status).toBe('error');
    });
  });

  describe('Resource Coordination', () => {
    it('manages resource allocation across pipeline', async () => {
      const audioModel = await context.projectManager.createModel('audio');
      
      try {
        await context.mockError(
          ErrorTestUtils.createErrorWithContext(
            'Resource allocation failed',
            {
              code: 'ALLOCATION_ERROR',
              details: {
                modelId: audioModel.id,
                resourceType: 'gpu'
              }
            }
          )
        );
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
        expect(context.projectManager.getModel(audioModel.id)?.status).toBe('error');
      }
    });

    it('recovers from resource exhaustion', async () => {
      const model = await context.projectManager.createModel('audio');
      
      try {
        await context.mockError(ErrorTestUtils.createResourceError('exhausted'));
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
      }

      // System should recover after reset
      await context.reset();
      expect(context.healthMonitor.getStatus()).toBe('healthy');

      // New model should work
      const newModel = await context.projectManager.createModel('audio');
      expect(newModel.status).toBe('ready');
    });
  });
});