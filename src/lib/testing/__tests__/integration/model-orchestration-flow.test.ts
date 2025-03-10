import { TestContext } from '../../test-context';
import { ErrorTestUtils } from '../../error-test-utils';

describe('Model Orchestration Flow', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await TestContext.create();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  describe('Model Pipeline', () => {
    it('coordinates model transitions with verification', async () => {
      const models = await Promise.all([
        context.projectManager.createModel('audio'),
        context.projectManager.createModel('pattern'),
        context.projectManager.createModel('verifier')
      ]);

      // Verify initial state
      models.forEach(model => {
        expect(context.projectManager.getModel(model.id)?.status).toBe('ready');
      });

      // Simulate successful transition
      expect(context.healthMonitor.getStatus()).toBe('healthy');
    });

    it('handles validation failures in pipeline', async () => {
      const processingModel = await context.projectManager.createModel('audio');
      const verifierModel = await context.projectManager.createModel('verifier');

      try {
        const validationError = ErrorTestUtils.createErrorWithContext(
          'Validation failed',
          {
            code: 'VALIDATION_ERROR',
            details: {
              modelId: processingModel.id,
              verifierId: verifierModel.id,
              reason: 'Output format mismatch'
            }
          }
        );
        await context.mockError(validationError);
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
        expect(context.projectManager.getModel(processingModel.id)?.status).toBe('error');
      }
    });

    it('maintains verification results through recovery', async () => {
      const pipeline = await Promise.all([
        context.projectManager.createModel('processor'),
        context.projectManager.createModel('verifier')
      ]);

      // First validation fails
      try {
        await context.mockHandoffError(pipeline[0], pipeline[1]);
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
      }

      // Reset and retry
      await context.reset();
      expect(context.healthMonitor.getStatus()).toBe('healthy');

      // New pipeline should work
      const newPipeline = await Promise.all([
        context.projectManager.createModel('processor'),
        context.projectManager.createModel('verifier')
      ]);

      newPipeline.forEach(model => {
        expect(model.status).toBe('ready');
      });
    });
  });

  describe('Verification Strategy', () => {
    it('handles concurrent verification requests', async () => {
      const verifier = await context.projectManager.createModel('verifier');
      const processors = await Promise.all([
        context.projectManager.createModel('processor1'),
        context.projectManager.createModel('processor2')
      ]);

      // Simulate concurrent verification errors
      const errors = processors.map(processor =>
        context.mockHandoffError(processor, verifier).catch(e => e)
      );

      await Promise.all(errors);

      // Verifier should be in error state
      expect(context.projectManager.getModel(verifier.id)?.status).toBe('error');
      expect(context.healthMonitor.getStatus()).toBe('error');

      const state = context.healthMonitor.getFullState();
      expect(state.errorCount).toBeGreaterThan(1);
    });

    it('escalates repeated verification failures', async () => {
      const processor = await context.projectManager.createModel('processor');
      const verifier = await context.projectManager.createModel('verifier');

      // First failure
      try {
        await context.mockHandoffError(processor, verifier);
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('warning');
      }

      // Second failure should escalate
      try {
        await context.mockHandoffError(processor, verifier);
      } catch (error) {
        expect(context.healthMonitor.getStatus()).toBe('error');
      }

      const state = context.healthMonitor.getFullState();
      expect(state.errorCount).toBe(2);
    });
  });
});