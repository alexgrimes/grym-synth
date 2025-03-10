import { ContextManager } from '../context-manager';
import { SpecializedContextManager } from './context-manager';
import { ModelSpecialization, ContextRoutingConfig } from './types';

const testConfig: ContextRoutingConfig = {
  defaultModel: 'deepseek-r1:14b',
  fallbackModel: 'llama2',
  themeWeights: {
    'code': 2.0,
    'audio': 1.5,
    'documentation': 1.0
  },
  minRelevanceScore: 0.6
};

// Example model specializations
const modelSpecs: ModelSpecialization[] = [
  {
    model: 'deepseek-r1:14b',
    platform: 'ollama',
    strengths: {
      domains: ['code', 'technical', 'analysis'],
      contextSize: 8192,
      specialFeatures: ['code-completion', 'refactoring']
    },
    contextManager: {
      priorityTopics: ['code', 'architecture', 'patterns'],
      contextWindow: [],
      summarizationStrategy: 'selective'
    }
  },
  {
    model: 'qwen:14b',
    platform: 'ollama',
    strengths: {
      domains: ['general', 'creative', 'conversation'],
      contextSize: 1000000,
      specialFeatures: ['long-context', 'creative-writing']
    },
    contextManager: {
      priorityTopics: ['context', 'narrative', 'explanation'],
      contextWindow: [],
      summarizationStrategy: 'minimal'
    }
  }
];

async function testSpecializedContextManager() {
  // Initialize managers
  const baseManager = new ContextManager();
  const specializedManager = new SpecializedContextManager(baseManager, testConfig);
  await specializedManager.init();

  // Test cases
  const testCases = [
    {
      query: "Can you help me refactor this code to use the factory pattern?",
      context: [
        "We have a large codebase with multiple object creation patterns",
        "Current implementation uses direct instantiation",
        "Need to make it more maintainable and flexible",
        "Should support adding new types easily"
      ]
    },
    {
      query: "Write a creative story about a musician's journey",
      context: [
        "The story should involve learning and growth",
        "Include details about musical instruments",
        "Focus on emotional development",
        "Show the impact of music on life"
      ]
    }
  ];

  // Run tests
  for (const test of testCases) {
    console.log('\nTesting query:', test.query);
    try {
      const result = await specializedManager.routeQueryToModel(
        test.query,
        test.context
      );

      console.log('Selected model:', result.model.model);
      console.log('Relevance score:', result.relevanceScore);
      console.log('Suggested followups:', result.suggestedFollowups);
      console.log('Context length:', result.context.length);
    } catch (error) {
      console.error('Test failed:', error);
    }
  }

  // Clean up
  await specializedManager.cleanup();
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSpecializedContextManager().catch(console.error);
}

export { testSpecializedContextManager };