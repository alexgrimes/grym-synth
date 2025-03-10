import { OllamaProvider } from '../ollama-provider';
import { ModelCapability, ModelOrchestratorError } from '../../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  const mockConfig = {
    modelName: 'deepseek-coder',
    endpoint: 'http://localhost:11434',
    contextWindow: 32768,
    temperature: 0.7,
    topP: 0.9
  };

  beforeEach(() => {
    provider = new OllamaProvider(
      'test-model',
      'Test Model',
      mockConfig.contextWindow,
      mockConfig
    );
    (global.fetch as jest.Mock).mockClear();
  });

  describe('initialization', () => {
    it('should initialize with correct capabilities for known models', () => {
      const capability = provider.capabilities.get('code');
      expect(capability?.score).toBeGreaterThan(0.9); // DeepSeek Coder is strong at code
      expect(capability?.confidence).toBeGreaterThan(0);
      expect(capability?.sampleSize).toBeGreaterThan(0);
    });

    it('should initialize with default capabilities for unknown models', () => {
      const unknownProvider = new OllamaProvider('unknown', 'Unknown', 32768, {
        ...mockConfig,
        modelName: 'unknown-model'
      });

      const capability = unknownProvider.capabilities.get('code');
      expect(capability?.score).toBe(0.7); // Default score
    });

    it('should override base capabilities with provided ones', () => {
      const customProvider = new OllamaProvider('custom', 'Custom', 32768, {
        ...mockConfig,
        capabilities: {
          code: 0.95,
          reasoning: 0.85
        }
      });

      expect(customProvider.capabilities.get('code')?.score).toBe(0.95);
      expect(customProvider.capabilities.get('reasoning')?.score).toBe(0.85);
    });
  });

  describe('process', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Test response' })
        })
      );
    });

    it('should process string input directly', async () => {
      const input = 'Simple test input';
      await provider.process(input);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.endpoint}/api/generate`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(input)
        })
      );
    });

    it('should format planning input correctly', async () => {
      const input = {
        type: 'planning',
        task: {
          description: 'Test task',
          type: 'code_generation',
          requirements: { language: 'typescript' }
        }
      };

      await provider.process(input);

      const requestBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body
      );
      expect(requestBody.prompt).toContain('Task Planning Request');
      expect(requestBody.prompt).toContain('Test task');
      expect(requestBody.prompt).toContain('typescript');
    });

    it('should format code input correctly', async () => {
      const input = {
        type: 'code',
        task: {
          description: 'Implement a function',
          requirements: { language: 'typescript' }
        },
        context: 'Previous code context'
      };

      await provider.process(input);

      const requestBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body
      );
      expect(requestBody.prompt).toContain('Code Generation Request');
      expect(requestBody.prompt).toContain('Implement a function');
      expect(requestBody.prompt).toContain('Previous code context');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Internal Server Error'
        })
      );

      await expect(provider.process('test')).rejects.toThrow(ModelOrchestratorError);
    });

    it('should parse JSON responses when possible', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: '{"key": "value"}' })
        })
      );

      const result = await provider.process('test');
      expect(result).toEqual({ key: 'value' });
    });

    it('should return raw text when JSON parsing fails', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Not JSON content' })
        })
      );

      const result = await provider.process('test');
      expect(result).toBe('Not JSON content');
    });
  });

  describe('testCapability', () => {
    it('should return capability scores for supported capabilities', async () => {
      const result = await provider.testCapability('code' as ModelCapability);
      expect(result.score).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sampleSize).toBeGreaterThan(0);
    });

    it('should return zero scores for unsupported capabilities', async () => {
      const result = await provider.testCapability('unknown' as ModelCapability);
      expect(result.score).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.sampleSize).toBe(0);
    });
  });

  describe('getResourceMetrics', () => {
    it('should fetch and return metrics when available', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              memory_usage: 1024,
              cpu_usage: 0.5,
              average_latency: 100
            })
        })
      );

      const metrics = await provider.getResourceMetrics();
      expect(metrics.memoryUsage).toBe(1024);
      expect(metrics.cpuUsage).toBe(0.5);
      expect(metrics.averageLatency).toBe(100);
    });

    it('should return default metrics when fetch fails', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      const metrics = await provider.getResourceMetrics();
      expect(metrics.memoryUsage).toBe(0);
      expect(metrics.cpuUsage).toBe(0);
      expect(metrics.averageLatency).toBe(0);
    });

    it('should return default metrics for missing values', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}) // Empty response
        })
      );

      const metrics = await provider.getResourceMetrics();
      expect(metrics.memoryUsage).toBe(0);
      expect(metrics.cpuUsage).toBe(0);
      expect(metrics.averageLatency).toBe(0);
    });
  });
});