import { LLMProvider, ChatOptions, ChatResponse, ModelCapabilities } from '../types';
import { createLearningEnhancedProvider } from './learning-enhanced-provider';
import { getModelAnalysis, visualizeProfile, deleteProfile } from '../../learning-profiles';

describe('Learning Enhanced Provider', () => {
  // Mock base provider
  const mockProvider: LLMProvider = {
    name: 'mock-provider',
    endpoint: 'http://localhost:8000',
    contextLimit: 4096,
    async chat(options: ChatOptions): Promise<ChatResponse> {
      return {
        role: 'assistant',
        content: 'This is a mock response about ' + 
          options.messages[options.messages.length - 1].content
      };
    },
    async healthCheck(): Promise<boolean> {
      return true;
    },
    async getCapabilities(): Promise<ModelCapabilities> {
      return {
        contextWindow: 4096,
        streamingSupport: false,
        specialTokens: {},
        modelType: 'chat'
      };
    }
  };

  const TEST_MODEL_ID = 'test-learning-model';

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await deleteProfile(TEST_MODEL_ID);
    } catch (e) {
      // Ignore if profile doesn't exist
    }
  });

  test('initializes and tracks learning from chat interactions', async () => {
    const enhancedProvider = createLearningEnhancedProvider(
      mockProvider,
      TEST_MODEL_ID,
      'code'
    );

    // Simulate a chat about TypeScript
    const response = await enhancedProvider.chat({
      messages: [
        {
          role: 'user',
          content: 'Explain TypeScript interfaces and their benefits in code organization'
        }
      ]
    });

    expect(response.role).toBe('assistant');
    expect(response.content).toContain('TypeScript');

    // Check that the learning profile was updated
    const analysis = await getModelAnalysis(TEST_MODEL_ID, 'code');
    expect(analysis).toBeTruthy();
    expect(analysis?.confidence).toBeGreaterThan(0);
    expect(analysis?.mastery).toBe('novice'); // First interaction
  });

  test('tracks multiple interactions and builds domain knowledge', async () => {
    const enhancedProvider = createLearningEnhancedProvider(
      mockProvider,
      TEST_MODEL_ID,
      'code'
    );

    // Multiple interactions about the same topic
    const interactions = [
      'What are TypeScript generics?',
      'How do TypeScript interfaces work?',
      'Explain TypeScript decorators',
      'Show me TypeScript utility types'
    ];

    for (const content of interactions) {
      await enhancedProvider.chat({
        messages: [{ role: 'user', content }]
      });
    }

    // Check learning progress
    const profile = await visualizeProfile(TEST_MODEL_ID);
    expect(profile).toBeTruthy();
    
    const typescriptDomain = profile?.domains.find(d => 
      d.name.toLowerCase().includes('typescript') || 
      d.name.toLowerCase().includes('code')
    );
    expect(typescriptDomain).toBeTruthy();
    expect(typescriptDomain?.confidence).toBeGreaterThan(0.3);
  });

  test('maintains original provider capabilities', async () => {
    const enhancedProvider = createLearningEnhancedProvider(
      mockProvider,
      TEST_MODEL_ID,
      'code'
    );

    expect(enhancedProvider.name).toBe(mockProvider.name);
    expect(enhancedProvider.endpoint).toBe(mockProvider.endpoint);
    expect(enhancedProvider.contextLimit).toBe(mockProvider.contextLimit);

    const capabilities = await enhancedProvider.getCapabilities();
    expect(capabilities).toEqual({
      contextWindow: 4096,
      streamingSupport: false,
      specialTokens: {},
      modelType: 'chat'
    });

    const health = await enhancedProvider.healthCheck();
    expect(health).toBe(true);
  });

  test('handles failed interactions appropriately', async () => {
    const failingProvider: LLMProvider = {
      ...mockProvider,
      async chat(): Promise<ChatResponse> {
        return {
          role: 'assistant',
          content: "I'm not sure how to help with that."
        };
      }
    };

    const enhancedProvider = createLearningEnhancedProvider(
      failingProvider,
      TEST_MODEL_ID,
      'code'
    );

    await enhancedProvider.chat({
      messages: [
        {
          role: 'user',
          content: 'Explain quantum computing algorithms'
        }
      ]
    });

    const analysis = await getModelAnalysis(TEST_MODEL_ID, 'code');
    expect(analysis?.confidence).toBeLessThanOrEqual(0.3); // Lower confidence due to failure
  });
});