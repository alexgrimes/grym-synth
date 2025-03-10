/**
 * Asset Manager Tests
 *
 * Tests for the asset management system.
 */

import { assetManager, AssetConfig } from '../asset-manager';
import { createMockAssetManager, createDefaultMockAssets } from '../asset-manager.mock';

// Use jest.mock to mock node-fetch
jest.mock('node-fetch', () => {
  return jest.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (name: string) => name === 'content-length' ? '1024' : null
      },
      body: {
        getReader: () => ({
          read: () => Promise.resolve({ done: true, value: new Uint8Array(0) })
        })
      }
    });
  });
});

describe('AssetManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mock Asset Manager', () => {
    it('should provide mock asset paths', async () => {
      // Create a mock asset manager with predefined assets
      const mockAssets = createDefaultMockAssets();
      const mockAssetManager = createMockAssetManager(mockAssets);

      // Check if assets exist
      const status = await mockAssetManager.checkAsset('audioldm-s-full');

      expect(status.exists).toBe(true);
      expect(status.valid).toBe(true);
      expect(status.path).toBe(mockAssets['audioldm-s-full']);
    });

    it('should simulate downloading assets', async () => {
      // Create a mock asset manager
      const mockAssetManager = createMockAssetManager({
        'test-model': '/mock/models/test-model.pt'
      });

      // Create a mock progress callback
      const progressCallback = jest.fn();
      const unregister = mockAssetManager.onProgress(progressCallback);

      // Download the asset
      const path = await mockAssetManager.downloadAsset('test-model');

      // Verify the path
      expect(path).toBe('/mock/models/test-model.pt');

      // Verify progress callbacks were called
      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenCalledWith(expect.objectContaining({
        assetId: 'test-model',
        status: 'pending'
      }));
      expect(progressCallback).toHaveBeenCalledWith(expect.objectContaining({
        assetId: 'test-model',
        status: 'downloading',
        percentage: 50
      }));
      expect(progressCallback).toHaveBeenCalledWith(expect.objectContaining({
        assetId: 'test-model',
        status: 'complete',
        percentage: 100
      }));

      // Unregister the callback
      unregister();
    });

    it('should handle missing assets', async () => {
      const mockAssetManager = createMockAssetManager({
        'existing-asset': '/mock/path/to/asset'
      });

      // Check a non-existent asset
      const status = await mockAssetManager.checkAsset('non-existent-asset');

      expect(status.exists).toBe(false);
      expect(status.valid).toBe(false);
      expect(status.error).toContain('not found');

      // Try to get the path to a non-existent asset
      await expect(mockAssetManager.getAssetPath('non-existent-asset'))
        .rejects.toThrow('not found');
    });

    it('should allow adding and removing assets', async () => {
      const mockAssetManager = createMockAssetManager();

      // Add a new asset
      const newAsset: AssetConfig = {
        id: 'new-asset',
        name: 'New Test Asset',
        description: 'A new test asset',
        url: 'https://example.com/new-asset',
        localPath: 'models/test/new-asset.bin',
        checksum: 'test-checksum',
        size: 1024,
        version: '1.0',
        required: true,
        tags: ['test']
      };

      await mockAssetManager.addAsset(newAsset);

      // Check if the asset was added
      const asset = mockAssetManager.getAsset('new-asset');
      expect(asset).toBeDefined();
      expect(asset?.name).toBe('New Test Asset');

      // Remove the asset
      await mockAssetManager.removeAsset('new-asset');

      // Check if the asset was removed
      const removedAsset = mockAssetManager.getAsset('new-asset');
      expect(removedAsset).toBeUndefined();
    });
  });

  // These tests would use the real AssetManager but with mocked network calls
  describe('Real Asset Manager with mocks', () => {
    beforeEach(async () => {
      // Initialize the asset manager before each test
      await assetManager.initialize();
    });

    it('should be properly initialized', () => {
      expect(assetManager).toBeDefined();
    });

    // Add more tests for the real asset manager here
    // These would use mocked network calls to test the actual implementation
  });
});
