import { ResourceManagerConfig } from '../types';

export const testConfig: ResourceManagerConfig = {
  maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
  maxCpuUsage: 80,
  optimizationThreshold: 0.8,
  cleanupInterval: 1000,
  cacheDir: './test-cache',
  limits: {
    maxModels: 5,
    maxTokensPerModel: 8192,
    maxTotalTokens: 32768
  },
  contextPreservation: {
    enabled: true,
    maxSize: 1024 * 1024, // 1MB
    preservationStrategy: 'hybrid'
  },
  debug: true
};