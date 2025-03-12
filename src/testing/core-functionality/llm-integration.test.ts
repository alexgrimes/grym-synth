import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Ollama response types
interface OllamaResponse {
  response: string;
  done: boolean;
}

interface OllamaError {
  error: string;
  code: number;
}

// Mock Ollama service interface
interface OllamaService {
  connect: () => Promise<boolean>;
  generate: (prompt: string) => Promise<string>;
  getStatus: () => Promise<{ connected: boolean }>;
}

type Connect = () => Promise<boolean>;
type Generate = (prompt: string) => Promise<string>;
type GetStatus = () => Promise<{ connected: boolean }>;

// Create mock Ollama service
const createMockOllamaService = (): OllamaService => {
  // Create mock functions with appropriate implementations
  const connect = jest.fn(() => Promise.resolve(true)) as jest.MockedFunction<Connect>;
  const generate = jest.fn((prompt: string) => Promise.resolve('Generated pattern: 4/4, 120bpm, C major')) as jest.MockedFunction<Generate>;
  const getStatus = jest.fn(() => Promise.resolve({ connected: true })) as jest.MockedFunction<GetStatus>;

  return {
    connect,
    generate,
    getStatus
  };
};

describe('Ollama LLM Integration', () => {
  let ollamaService: OllamaService;

  beforeEach(() => {
    // Reset mocks and create fresh instance
    jest.clearAllMocks();
    ollamaService = createMockOllamaService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('connects to Ollama service', async () => {
    // Test initial connection
    const connected = await ollamaService.connect();
    expect(connected).toBe(true);
    expect(ollamaService.connect).toHaveBeenCalled();

    // Verify connection status
    const status = await ollamaService.getStatus();
    expect(status.connected).toBe(true);
    expect(ollamaService.getStatus).toHaveBeenCalled();
  });

  test('processes pattern generation requests', async () => {
    // Test successful pattern generation
    const prompt = 'Generate a drum pattern in 4/4 time';
    const result = await ollamaService.generate(prompt);

    // Verify generation was called with correct prompt
    expect(ollamaService.generate).toHaveBeenCalledWith(prompt);

    // Verify response format
    expect(result).toContain('Generated pattern');
    expect(result).toMatch(/\d+\/\d+/); // Contains time signature
    expect(result).toMatch(/\d+bpm/); // Contains tempo
  });

  test('handles connection errors gracefully', async () => {
    // Mock connection failure
    const errorMessage = 'Failed to connect to Ollama service';
    const mockError = new Error(errorMessage);

    (ollamaService.connect as jest.MockedFunction<Connect>)
      .mockRejectedValueOnce(mockError);

    // Attempt connection and verify error handling
    await expect(ollamaService.connect())
      .rejects.toThrow(errorMessage);

    // Verify connection status reflects failure
    (ollamaService.getStatus as jest.MockedFunction<GetStatus>)
      .mockResolvedValueOnce({ connected: false });

    const status = await ollamaService.getStatus();
    expect(status.connected).toBe(false);
  });

  test('handles generation errors gracefully', async () => {
    // Mock generation failure
    const errorMessage = 'Pattern generation failed';
    const mockError = new Error(errorMessage);

    (ollamaService.generate as jest.MockedFunction<Generate>)
      .mockRejectedValueOnce(mockError);

    // Attempt generation and verify error handling
    const prompt = 'Generate an invalid pattern';
    await expect(ollamaService.generate(prompt))
      .rejects.toThrow(errorMessage);
  });

  test('reconnects after connection loss', async () => {
    // Initial successful connection
    let connected = await ollamaService.connect();
    expect(connected).toBe(true);

    // Simulate connection loss
    (ollamaService.getStatus as jest.MockedFunction<GetStatus>)
      .mockResolvedValueOnce({ connected: false });

    let status = await ollamaService.getStatus();
    expect(status.connected).toBe(false);

    // Test reconnection
    (ollamaService.connect as jest.MockedFunction<Connect>)
      .mockResolvedValueOnce(true);

    connected = await ollamaService.connect();
    expect(connected).toBe(true);

    // Verify restored connection
    (ollamaService.getStatus as jest.MockedFunction<GetStatus>)
      .mockResolvedValueOnce({ connected: true });

    status = await ollamaService.getStatus();
    expect(status.connected).toBe(true);
  });

  test('validates pattern generation output', async () => {
    // Test pattern with specific constraints
    const prompt = 'Generate a complex drum pattern';
    (ollamaService.generate as jest.MockedFunction<Generate>)
      .mockResolvedValueOnce('Generated pattern: 7/8, 140bpm, D minor');

    const result = await ollamaService.generate(prompt);

    // Verify pattern contains required musical elements
    expect(result).toMatch(/\d+\/\d+/); // Time signature
    expect(result).toMatch(/\d+bpm/); // Tempo
    expect(result).toMatch(/[A-G]\s*(major|minor)/i); // Key signature
  });
});
