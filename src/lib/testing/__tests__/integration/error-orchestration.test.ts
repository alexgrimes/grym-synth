import { TestContext } from '../../test-context';
import { ErrorTestUtils } from '../../error-test-utils';

describe('Error Handling + Model Orchestration Integration', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await TestContext.create();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  it('handles errors during model transitions', async () => {
    const sourceModel = await context.projectManager.createModel('audio');
    const targetModel = await context.projectManager.createModel('pattern');

    try {
      await context.mockHandoffError(sourceModel, targetModel);
    } catch (error) {
      expect(context.healthMonitor.getStatus()).toBe('warning');
      expect(context.projectManager.getModel(sourceModel.id)?.status).toBe('error');
      expect(context.projectManager.getModel(targetModel.id)?.status).toBe('error');
    }

    const state = context.healthMonitor.getFullState();
    expect(state.errorCount).toBe(1);
    expect(state.metrics.lastError).toBeDefined();
  });

  it('preserves context during error recovery', async () => {
    const models = await Promise.all([
      context.projectManager.createModel('audio'),
      context.projectManager.createModel('pattern'),
      context.projectManager.createModel('classifier')
    ]);

    // Create error in first handoff
    try {
      await context.mockHandoffError(models[0], models[1]);
    } catch (error) {
      expect(context.healthMonitor.getStatus()).toBe('warning');
    }

    // Third model should still be operational
    expect(context.projectManager.getModel(models[2].id)?.status).toBe('ready');

    // Verify error context preserved
    const state = context.healthMonitor.getFullState();
    expect(state.errorCount).toBe(1);
    const errorDetails = state.metrics.lastError as any;
    expect(errorDetails?.source).toBe(models[0].id);
    expect(errorDetails?.target).toBe(models[1].id);
  });

  it('handles concurrent model errors', async () => {
    const models = await Promise.all([
      context.projectManager.createModel('audio'),
      context.projectManager.createModel('pattern'),
      context.projectManager.createModel('classifier')
    ]);

    // Trigger multiple errors concurrently
    await Promise.all([
      context.mockHandoffError(models[0], models[1]).catch(() => {}),
      context.mockError(ErrorTestUtils.createResourceError('exhausted')).catch(() => {}),
      context.mockHandoffError(models[1], models[2]).catch(() => {})
    ]);

    // System should be in error state after multiple failures
    expect(context.healthMonitor.getStatus()).toBe('error');

    // All models should be in error state
    models.forEach(model => {
      expect(context.projectManager.getModel(model.id)?.status).toBe('error');
    });

    const state = context.healthMonitor.getFullState();
    expect(state.errorCount).toBeGreaterThan(1);
  });

  it('recovers system state after error resolution', async () => {
    const model = await context.projectManager.createModel('audio');

    // Create error condition
    try {
      await context.mockError(ErrorTestUtils.createResourceError('exhausted'));
    } catch (error) {
      expect(context.healthMonitor.getStatus()).toBe('warning');
      expect(context.projectManager.getModel(model.id)?.status).toBe('error');
    }

    // Reset system
    await context.reset();

    // Verify clean state
    expect(context.healthMonitor.getStatus()).toBe('healthy');
    expect(context.projectManager.getModel(model.id)).toBeUndefined();
    
    // Create new model
    const newModel = await context.projectManager.createModel('audio');
    expect(newModel.status).toBe('ready');
  });

  it('maintains error context through transitions', async () => {
    const sourceModel = await context.projectManager.createModel('audio');
    const targetModel = await context.projectManager.createModel('pattern');

    const customError = ErrorTestUtils.createErrorWithContext(
      'Transition error',
      {
        code: 'TRANSITION_ERROR',
        details: {
          operation: 'handoff',
          sourceType: sourceModel.type,
          targetType: targetModel.type,
          timestamp: new Date().toISOString()
        }
      }
    );

    try {
      await context.mockError(customError);
    } catch (error) {
      const state = context.healthMonitor.getFullState();
      expect(state.metrics.lastError).toBe(customError);
      expect((state.metrics.lastError as any)?.details?.operation).toBe('handoff');
    }
  });
});