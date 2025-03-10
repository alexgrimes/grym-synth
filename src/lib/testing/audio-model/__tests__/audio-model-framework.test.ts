import { AudioModel, AudioTestSuite } from '../../../types/testing';
import { AudioModelTestFramework } from '../audio-model-test-framework';
import { AudioTestHelpers } from '../audio-test-helpers';

describe('Audio Model Test Framework', () => {
  let testModel: AudioModel;

  beforeEach(() => {
    // Setup test model
    testModel = {
      id: 'test-model',
      name: 'Test Audio Model',
      capabilities: {
        transcription: true,
        synthesis: true,
        streaming: true
      },
      maxConcurrentRequests: 4,
      resourceRequirements: {
        minMemory: 1024 * 1024 * 512, // 512MB
        gpuRequired: true
      }
    };
  });

  describe('Model Validation', () => {
    it('should validate correct model configuration', () => {
      expect(AudioTestHelpers.validateModelConfig(testModel)).toBe(true);
    });

    it('should reject invalid model configuration', () => {
      const invalidModel: AudioModel = {
        id: 'invalid-model',
        name: 'Invalid Model',
        capabilities: {},
        maxConcurrentRequests: 1
      };
      expect(AudioTestHelpers.validateModelConfig(invalidModel)).toBe(false);
    });
  });
});