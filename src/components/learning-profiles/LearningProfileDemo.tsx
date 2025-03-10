import React, { useEffect, useState } from 'react';
import { ModelLearningView } from './ModelLearningView';
import { createLearningEnhancedOllamaProvider } from '../../lib/llm/providers/learning-enhanced-provider';
import { LLMProvider } from '../../lib/llm/types';

const DEMO_PROMPTS = [
  {
    topic: 'TypeScript',
    prompt: 'Explain TypeScript interfaces and how they help with code organization.'
  },
  {
    topic: 'React',
    prompt: 'What are React hooks and how do they improve component development?'
  },
  {
    topic: 'Node.js',
    prompt: 'Explain Node.js event loop and how it handles asynchronous operations.'
  },
  {
    topic: 'GraphQL',
    prompt: 'Compare GraphQL with REST APIs and explain its advantages.'
  }
];

export function LearningProfileDemo() {
  const [provider, setProvider] = useState<LLMProvider | null>(null);
  const [modelId, setModelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [response, setResponse] = useState<string>('');

  useEffect(() => {
    const initProvider = async () => {
      try {
        const enhancedProvider = createLearningEnhancedOllamaProvider('codellama', 'code');
        setProvider(enhancedProvider);
        setModelId(`ollama-codellama`);
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize provider:', error);
        setLoading(false);
      }
    };

    initProvider();
  }, []);

  const handleNextPrompt = async () => {
    if (!provider) return;

    setLoading(true);
    try {
      const prompt = DEMO_PROMPTS[currentPrompt];
      const result = await provider.chat({
        messages: [
          {
            role: 'user',
            content: prompt.prompt
          }
        ]
      });

      setResponse(result.content);
      setCurrentPrompt((prev) => (prev + 1) % DEMO_PROMPTS.length);
    } catch (error) {
      console.error('Failed to get response:', error);
    }
    setLoading(false);
  };

  if (!provider || !modelId) {
    return <div>Initializing learning profile demo...</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Model Learning Profile Demo</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Current Topic: {DEMO_PROMPTS[currentPrompt].topic}</h3>
            <p className="text-gray-600">{DEMO_PROMPTS[currentPrompt].prompt}</p>
          </div>

          {response && (
            <div className="bg-gray-50 rounded p-4">
              <h4 className="font-medium mb-2">Model Response:</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
            </div>
          )}

          <button
            onClick={handleNextPrompt}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white ${
              loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? 'Processing...' : 'Try Next Prompt'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <ModelLearningView modelId={modelId} />
      </div>
    </div>
  );
}