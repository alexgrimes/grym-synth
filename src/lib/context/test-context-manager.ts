import { ContextManager } from './context-manager';
import { Message } from '../storage/types';
import fetch from 'node-fetch';

// Mock fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ContextManager', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
    jest.clearAllMocks();
  });

  describe('Provider-Specific Context Management', () => {
    it('should handle Ollama model context', async () => {
      // Mock Ollama API response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Test response from Ollama' })
      } as any);

      const messages: Message[] = [
        {
          id: '1',
          conversationId: 'test-conv',
          role: 'user',
          content: 'What is TypeScript?',
          timestamp: Date.now()
        }
      ];

      const state = await contextManager.updateContext(messages[0], 'Test response from Ollama');

      expect(state.messages).toHaveLength(2);
      expect(state.metadata.modelId).toBe('deepseek-r1:14b');
      
      // Verify Ollama API format
      expect(mockedFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('deepseek-r1:14b')
        })
      );
    });

    it('should handle LM Studio model context', async () => {
      // Mock LM Studio API response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Test response from LM Studio'
            }
          }]
        })
      } as any);

      const messages: Message[] = [
        {
          id: '1',
          conversationId: 'test-conv',
          role: 'user',
          content: 'What is quantum computing?',
          timestamp: Date.now(),
          model: 'qwen2.5-vl-7b-instruct'
        }
      ];

      const state = await contextManager.updateContext(messages[0], 'Test response from LM Studio');

      expect(state.messages).toHaveLength(2);
      expect(state.metadata.modelId).toBe('qwen2.5-vl-7b-instruct');
      
      // Verify LM Studio API format
      expect(mockedFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:1234/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('qwen2.5-vl-7b-instruct')
        })
      );
    });
  });

  describe('Cross-Provider Context Preservation', () => {
    it('should preserve context when switching between Ollama and LM Studio', async () => {
      // Mock theme analysis response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify([{
                theme: 'Programming Concepts',
                messages: []
              }])
            }
          }]
        })
      } as any);

      const messages: Message[] = [
        {
          id: '1',
          conversationId: 'test-conv',
          role: 'user',
          content: 'What is TypeScript?',
          timestamp: Date.now(),
          model: 'deepseek-r1:14b'
        },
        {
          id: '2',
          conversationId: 'test-conv',
          role: 'assistant',
          content: 'TypeScript is a strongly typed programming language that builds on JavaScript.',
          timestamp: Date.now(),
          model: 'deepseek-r1:14b'
        }
      ];

      const preserved = await contextManager.preserveContext(
        'deepseek-r1:14b',
        'qwen2.5-vl-7b-instruct',
        messages
      );

      expect(preserved.messages).toHaveLength(2);
      expect(preserved.metadata.modelId).toBe('qwen2.5-vl-7b-instruct');
    });

    it('should handle different context window sizes appropriately', async () => {
      // Create a long conversation that exceeds DeepSeek's context limit
      const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        conversationId: 'test-conv',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} with some content that takes up tokens in the context window`,
        timestamp: Date.now() - (100 - i) * 1000,
        model: 'qwen2.5-vl-7b-instruct'
      }));

      // Mock theme analysis and summarization responses
      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify([{
                  theme: 'Long Conversation',
                  messages: messages.slice(0, 50)
                }, {
                  theme: 'Continued Discussion',
                  messages: messages.slice(50)
                }])
              }
            }]
          })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: 'Summary of first half of conversation'
              }
            }]
          })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: 'Summary of second half of conversation'
              }
            }]
          })
        } as any);

      const state = await contextManager.preserveContext(
        'qwen2.5-vl-7b-instruct',
        'deepseek-r1:14b',
        messages
      );

      // Should have summaries and fewer messages due to DeepSeek's smaller context window
      expect(state.summaries.length).toBeGreaterThan(0);
      expect(state.messages.length).toBeLessThan(messages.length);
      expect(state.metadata.contextSize).toBeLessThan(8192); // DeepSeek's limit
    });
  });

  describe('Theme-based Organization', () => {
    it('should group related messages by theme', async () => {
      // Mock theme analysis response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify([{
                theme: 'Quantum Computing',
                messages: []
              }])
            }
          }]
        })
      } as any);

      const messages: Message[] = [
        {
          id: '1',
          conversationId: 'test-conv',
          role: 'user',
          content: 'What is quantum computing?',
          timestamp: Date.now()
        },
        {
          id: '2',
          conversationId: 'test-conv',
          role: 'assistant',
          content: 'Quantum computing uses quantum mechanics to perform computations.',
          timestamp: Date.now(),
          model: 'deepseek-r1:14b'
        },
        {
          id: '3',
          conversationId: 'test-conv',
          role: 'user',
          content: 'How do quantum bits work?',
          timestamp: Date.now()
        }
      ];

      const state = await contextManager.preserveContext(
        'deepseek-r1:14b',
        'qwen2.5-vl-7b-instruct',
        messages
      );

      // Messages should be preserved as is since they're related
      expect(state.messages).toHaveLength(3);
    });
  });

  describe('Storage Integration', () => {
    it('should persist and retrieve context state', async () => {
      const message: Message = {
        id: '1',
        conversationId: 'test-conv',
        role: 'user',
        content: 'Test message',
        timestamp: Date.now()
      };

      const response = 'Test response';

      // Mock API response for any summarization that might happen
      mockedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Test summary'
            }
          }]
        })
      } as any);

      // Update context
      await contextManager.updateContext(message, response);

      // Get context
      const state = await contextManager.getContext('deepseek-r1:14b');

      expect(state).toBeDefined();
      expect(state?.messages).toHaveLength(2);
    });

    it('should handle provider-specific context states', async () => {
      // Mock API responses
      mockedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Test response'
            }
          }]
        })
      } as any);

      // Add messages for both providers
      const ollamaMessage: Message = {
        id: '1',
        conversationId: 'test-conv',
        role: 'user',
        content: 'Ollama test',
        timestamp: Date.now(),
        model: 'deepseek-r1:14b'
      };

      const lmStudioMessage: Message = {
        id: '2',
        conversationId: 'test-conv',
        role: 'user',
        content: 'LM Studio test',
        timestamp: Date.now(),
        model: 'qwen2.5-vl-7b-instruct'
      };

      await contextManager.updateContext(ollamaMessage, 'Ollama response');
      await contextManager.updateContext(lmStudioMessage, 'LM Studio response');

      // Get contexts
      const ollamaState = await contextManager.getContext('deepseek-r1:14b');
      const lmStudioState = await contextManager.getContext('qwen2.5-vl-7b-instruct');

      expect(ollamaState?.messages[0].content).toBe('Ollama test');
      expect(lmStudioState?.messages[0].content).toBe('LM Studio test');
    });

    it('should clear context state', async () => {
      const message: Message = {
        id: '1',
        conversationId: 'test-conv',
        role: 'user',
        content: 'Test message',
        timestamp: Date.now()
      };

      // Mock API response
      mockedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Test response'
            }
          }]
        })
      } as any);

      const response = 'Test response';

      // Update context
      await contextManager.updateContext(message, response);

      // Clear context
      await contextManager.clearContext('deepseek-r1:14b');

      // Get context
      const state = await contextManager.getContext('deepseek-r1:14b');

      expect(state).toBeNull();
    });
  });
});
