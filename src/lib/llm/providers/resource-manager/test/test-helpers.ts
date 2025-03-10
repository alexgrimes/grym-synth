import { Message, SystemResources, ModelConstraints, ModelContextState } from '../types';
import { MockLLMProvider } from './mock-llm-provider';

export interface TestProviderConfig {
  specialization: 'audio-specialist' | 'composition-specialist';
  errorRate?: number;
  maxTokens?: number;
  resourceUsage?: {
    memoryUsage: number;
    cpuUsage: number;
    tokenCount: number;
    messageCount: number;
  };
}

export const createTestMessage = (content: string): Message => ({
  content,
  role: 'user',
  timestamp: Date.now()
});

export const DEFAULT_MODEL_CONSTRAINTS: ModelConstraints = {
  maxTokens: 1000,
  contextWindow: 2048,
  truncateMessages: true
};

export const createTestModelConstraints = (overrides: Partial<ModelConstraints> = {}): ModelConstraints => ({
  ...DEFAULT_MODEL_CONSTRAINTS,
  ...overrides
});

export const createTestSystemResources = (overrides: Partial<SystemResources> = {}): SystemResources => ({
  memory: 0,
  cpu: 0,
  totalMemory: 1024 * 1024 * 1024, // 1GB
  availableCores: 4,
  gpuMemory: 0,
  timestamp: Date.now(),
  memoryPressure: 0,
  ...overrides
});

export const createTestContext = (
  modelId: string,
  constraints: ModelConstraints = DEFAULT_MODEL_CONSTRAINTS,
  overrides: Partial<ModelContextState> = {}
): ModelContextState => ({
  modelId,
  messages: [],
  tokenCount: 0,
  tokens: 0,
  constraints,
  metadata: {
    lastAccess: Date.now(),
    createdAt: Date.now(),
    priority: 1,
    lastUpdated: Date.now(),
    importance: 0
  },
  ...overrides
});

export const createTestProvider = (
  name: string = 'test-provider',
  config: TestProviderConfig
): MockLLMProvider => {
  const { specialization, errorRate = 0, maxTokens = 1000, resourceUsage } = config;
  return new MockLLMProvider(
    name,
    `mock://${name}`,
    2048,
    specialization,
    {
      errorRate,
      maxTokens,
      resourceUsage: resourceUsage || {
        memoryUsage: 0,
        cpuUsage: 0,
        tokenCount: 0,
        messageCount: 0
      }
    }
  );
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createMockEvent = (type: string, data: any = {}) => ({
  type,
  timestamp: Date.now(),
  data
});

export const mockPressureEvent = {
  type: 'resourcePressure',
  timestamp: Date.now(),
  data: {
    pressure: 0.85,
    threshold: 0.8,
    source: 'memory'
  }
};

export const mockExhaustionEvent = {
  type: 'resourceExhausted',
  timestamp: Date.now(),
  data: {
    reason: 'Memory limit exceeded',
    limit: 1000,
    current: 1100
  }
};

export const mockCleanupEvent = {
  type: 'resourceCleanup',
  timestamp: Date.now(),
  data: {
    bytesFreed: 500,
    messageCount: 3,
    duration: 50
  }
};

export const waitForEvent = async (
  emitter: { on: (event: string, handler: (data: any) => void) => void },
  eventName: string,
  timeout: number = 1000
): Promise<any> => {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }
    }, timeout);

    emitter.on(eventName, (data) => {
      resolved = true;
      clearTimeout(timer);
      resolve(data);
    });
  });
};

export const simulateResourcePressure = async (
  provider: MockLLMProvider,
  pressure: number = 0.9
): Promise<void> => {
  await provider.simulateMemoryPressure(pressure);
};