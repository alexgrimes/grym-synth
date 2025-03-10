import { ModelContextState } from '../types';
import { createTestContext } from './test-helpers';

export const mockModelProvider = {
  loadModel: jest.fn().mockResolvedValue(true),
  unloadModel: jest.fn().mockResolvedValue(true),
  getContext: jest.fn().mockImplementation((modelId: string): ModelContextState => {
    return createTestContext(100);
  }),
  setContext: jest.fn().mockResolvedValue(true),
  generateResponse: jest.fn().mockImplementation((input: string) => {
    return Promise.resolve({
      response: 'Mocked response for: ' + input,
      usage: {
        promptTokens: input.length,
        completionTokens: 20,
        totalTokens: input.length + 20
      }
    });
  })
};