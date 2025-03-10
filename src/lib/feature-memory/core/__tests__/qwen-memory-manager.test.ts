import os from 'os';
import { Qwen2MemoryManager } from '../qwen-memory-manager';
import { Qwen2Quantization } from '../types';
import type { MemoryStatus, MemoryStats } from '../types';

// Mock os module
jest.mock('os');
const mockedOs = os as jest.Mocked<typeof os>;

describe('Qwen2MemoryManager', () => {
  let manager: Qwen2MemoryManager;
  const GB = 1024 * 1024 * 1024;
  const MB = 1024 * 1024;

  beforeEach(() => {
    manager = new Qwen2MemoryManager();
    jest.clearAllMocks();
  });

  describe('memory thresholds', () => {
    it('should enforce correct memory requirements for Q4_K_M', async () => {
      mockedOs.totalmem.mockReturnValue(16 * GB);
      mockedOs.freemem.mockReturnValue(6 * GB);

      const canLoad = await manager.canLoadModel(Qwen2Quantization.Q4_K_M);
      expect(canLoad).toBe(true);

      // First load the model
      await manager.registerModelLoad(Qwen2Quantization.Q4_K_M);
      
      // Then check the memory requirements
      const stats = manager.getMemoryStats();
      expect(stats.modelRequirements?.ramNeeded).toBe(4.2 * GB);
    });

    it('should enforce minimum free memory requirement', async () => {
      // Mock just enough memory for model but not buffer
      mockedOs.totalmem.mockReturnValue(8 * GB);
      mockedOs.freemem.mockReturnValue(4.3 * GB); // 4.2GB + 100MB (not enough buffer)

      const canLoad = await manager.canLoadModel(Qwen2Quantization.Q4_K_M);
      expect(canLoad).toBe(false);
    });

    it('should recommend appropriate quantization based on available memory', async () => {
      // Test high memory system
      mockedOs.totalmem.mockReturnValue(32 * GB);
      mockedOs.freemem.mockReturnValue(16 * GB);
      expect(await manager.getRecommendedQuantization()).toBe(Qwen2Quantization.Q5_K_M);

      // Test low memory system
      mockedOs.totalmem.mockReturnValue(8 * GB);
      mockedOs.freemem.mockReturnValue(4 * GB);
      expect(await manager.getRecommendedQuantization()).toBe(Qwen2Quantization.Q4_0);

      // Test standard system
      mockedOs.totalmem.mockReturnValue(16 * GB);
      mockedOs.freemem.mockReturnValue(8 * GB);
      expect(await manager.getRecommendedQuantization()).toBe(Qwen2Quantization.Q4_K_M);
    });
  });

  describe('memory status monitoring', () => {
    beforeEach(async () => {
      mockedOs.totalmem.mockReturnValue(16 * GB);
      mockedOs.freemem.mockReturnValue(8 * GB);
      await manager.registerModelLoad(Qwen2Quantization.Q4_K_M);
    });

    it('should report correct status based on available memory', () => {
      // Test sufficient memory
      mockedOs.freemem.mockReturnValue(6 * GB);
      let status = manager.checkMemoryStatus();
      expect(status.status).toBe('ok');

      // Test warning threshold
      mockedOs.freemem.mockReturnValue(800 * MB);
      status = manager.checkMemoryStatus();
      expect(status.status).toBe('warning');
      expect(status.warning).toContain('approaching minimum threshold');

      // Test critical threshold
      mockedOs.freemem.mockReturnValue(400 * MB);
      status = manager.checkMemoryStatus();
      expect(status.status).toBe('critical');
      expect(status.warning).toContain('below minimum requirement');
    });

    it('should track loaded model state', async () => {
      // Initial state after load
      let stats = manager.getMemoryStats();
      expect(stats.modelLoaded).toBe(true);
      expect(stats.currentQuantization).toBe(Qwen2Quantization.Q4_K_M);

      // After unload
      manager.unregisterModel();
      stats = manager.getMemoryStats();
      expect(stats.modelLoaded).toBe(false);
      expect(stats.currentQuantization).toBeNull();
      expect(stats.modelRequirements).toBeUndefined();
    });
  });

  describe('memory stats reporting', () => {
    it('should provide detailed memory statistics', () => {
      mockedOs.totalmem.mockReturnValue(16 * GB);
      mockedOs.freemem.mockReturnValue(8 * GB);

      const stats = manager.getMemoryStats();
      expect(stats).toMatchObject({
        total: 16 * GB,
        available: 8 * GB,
        used: 8 * GB,
        percentUsed: 50,
        percentFree: 50,
        modelLoaded: false
      });
    });

    it('should include model requirements when loaded', async () => {
      mockedOs.totalmem.mockReturnValue(16 * GB);
      mockedOs.freemem.mockReturnValue(8 * GB);

      await manager.registerModelLoad(Qwen2Quantization.Q4_K_M);
      const stats = manager.getMemoryStats();
      
      expect(stats.modelLoaded).toBe(true);
      expect(stats.currentQuantization).toBe(Qwen2Quantization.Q4_K_M);
      expect(stats.modelRequirements).toMatchObject({
        type: 'edge_optimized',
        ramNeeded: 4.2 * GB,
        minFreeMemory: 512 * MB
      });
    });
  });

  describe('error handling', () => {
    it('should prevent loading model with insufficient memory', async () => {
      mockedOs.totalmem.mockReturnValue(8 * GB);
      mockedOs.freemem.mockReturnValue(2 * GB);

      await expect(manager.registerModelLoad(Qwen2Quantization.Q4_K_M))
        .rejects
        .toThrow('Insufficient memory');
    });

    it('should throw error when accessing threshold without loaded model', () => {
      expect(() => manager.getMemoryThreshold())
        .toThrow('No model quantization selected');
    });

    it('should handle multiple model loads and unloads', async () => {
      mockedOs.totalmem.mockReturnValue(16 * GB);
      mockedOs.freemem.mockReturnValue(8 * GB);

      // Load Q4_K_M
      await manager.registerModelLoad(Qwen2Quantization.Q4_K_M);
      expect(manager.getMemoryStats().currentQuantization).toBe(Qwen2Quantization.Q4_K_M);

      // Unload
      manager.unregisterModel();
      expect(manager.getMemoryStats().modelLoaded).toBe(false);

      // Load Q4_0
      await manager.registerModelLoad(Qwen2Quantization.Q4_0);
      expect(manager.getMemoryStats().currentQuantization).toBe(Qwen2Quantization.Q4_0);
    });
  });
});