/**
 * Mock Asset Manager
 *
 * Provides a mock implementation of the asset manager for testing purposes.
 * This allows tests to run without requiring actual asset downloads or external dependencies.
 */

import {
  AssetConfig,
  AssetManagerOptions,
  AssetStatus,
  DownloadProgress
} from './asset-manager';

/**
 * Mock asset paths for testing
 */
export interface MockAssetPaths {
  [assetId: string]: string;
}

/**
 * Mock asset manager class for testing
 * Implements the same interface as AssetManager but with mock functionality
 */
export class MockAssetManager {
  private mockAssetPaths: MockAssetPaths;
  private mockAssets: Map<string, AssetConfig> = new Map();
  private progressCallbacks: Set<(progress: DownloadProgress) => void> = new Set();
  private options: AssetManagerOptions;

  /**
   * Create a new MockAssetManager
   */
  constructor(mockAssetPaths: MockAssetPaths = {}, options: AssetManagerOptions = {}) {
    this.mockAssetPaths = mockAssetPaths;
    this.options = options;

    // Create mock assets based on the provided paths
    for (const [assetId, assetPath] of Object.entries(mockAssetPaths)) {
      this.mockAssets.set(assetId, {
        id: assetId,
        name: `Mock ${assetId}`,
        description: `Mock asset for testing: ${assetId}`,
        url: `https://example.com/mock/${assetId}`,
        localPath: assetPath,
        checksum: `mock-checksum-${assetId}`,
        size: 1024,
        version: '1.0',
        required: true,
        tags: ['mock', 'test']
      });
    }
  }

  /**
   * Initialize the mock asset manager
   */
  public async initialize(): Promise<void> {
    // No-op for mock implementation
    return Promise.resolve();
  }

  /**
   * Check if a mock asset exists
   */
  public async checkAsset(assetId: string): Promise<AssetStatus> {
    if (this.mockAssetPaths[assetId]) {
      return {
        id: assetId,
        exists: true,
        valid: true,
        path: this.mockAssetPaths[assetId]
      };
    }

    return {
      id: assetId,
      exists: false,
      valid: false,
      error: `Mock asset not found: ${assetId}`
    };
  }

  /**
   * Get the path to a mock asset
   */
  public async getAssetPath(assetId: string): Promise<string> {
    const mockPath = this.mockAssetPaths[assetId];

    if (mockPath) {
      return mockPath;
    }

    throw new Error(`Mock asset not found: ${assetId}`);
  }

  /**
   * Simulate downloading a mock asset
   */
  public async downloadAsset(assetId: string): Promise<string> {
    const mockPath = this.mockAssetPaths[assetId];

    if (!mockPath) {
      throw new Error(`Mock asset not found: ${assetId}`);
    }

    // Simulate download progress
    this.updateProgress({
      assetId,
      bytesDownloaded: 0,
      totalBytes: 1024,
      percentage: 0,
      status: 'pending'
    });

    // Simulate download delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate download progress
    this.updateProgress({
      assetId,
      bytesDownloaded: 512,
      totalBytes: 1024,
      percentage: 50,
      status: 'downloading'
    });

    // Simulate download delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate download completion
    this.updateProgress({
      assetId,
      bytesDownloaded: 1024,
      totalBytes: 1024,
      percentage: 100,
      status: 'complete'
    });

    return mockPath;
  }

  /**
   * Download all required mock assets
   */
  public async downloadRequiredAssets(): Promise<void> {
    for (const assetId of Object.keys(this.mockAssetPaths)) {
      const asset = this.mockAssets.get(assetId);
      if (asset && asset.required) {
        await this.downloadAsset(assetId);
      }
    }
  }

  /**
   * Register a progress callback
   */
  public onProgress(callback: (progress: DownloadProgress) => void): () => void {
    this.progressCallbacks.add(callback);

    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Update download progress and notify listeners
   */
  private updateProgress(progress: DownloadProgress): void {
    for (const callback of this.progressCallbacks) {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback', error);
      }
    }
  }

  /**
   * Check all mock assets
   */
  public async checkAllAssets(): Promise<AssetStatus[]> {
    return Promise.all(
      Object.keys(this.mockAssetPaths).map(assetId => this.checkAsset(assetId))
    );
  }

  /**
   * Get all mock assets
   */
  public getAssets(): AssetConfig[] {
    return Array.from(this.mockAssets.values());
  }

  /**
   * Get a specific mock asset
   */
  public getAsset(assetId: string): AssetConfig | undefined {
    return this.mockAssets.get(assetId);
  }

  /**
   * Add a new mock asset
   */
  public async addAsset(asset: AssetConfig): Promise<void> {
    this.mockAssets.set(asset.id, asset);
    this.mockAssetPaths[asset.id] = asset.localPath;
  }

  /**
   * Remove a mock asset
   */
  public async removeAsset(assetId: string): Promise<void> {
    this.mockAssets.delete(assetId);
    delete this.mockAssetPaths[assetId];
  }

  /**
   * Mock implementation of restoreAsset
   */
  public async restoreAsset(assetPath: string): Promise<void> {
    // Find the asset with the given path
    const asset = Array.from(this.mockAssets.values()).find(
      a => a.localPath === assetPath
    );

    if (!asset) {
      throw new Error(`Mock asset not found with path: ${assetPath}`);
    }

    // Simulate restoration delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Create a mock asset manager for testing
 */
export function createMockAssetManager(
  mockAssetPaths: MockAssetPaths = {},
  options: AssetManagerOptions = {}
): MockAssetManager {
  return new MockAssetManager(mockAssetPaths, options);
}

/**
 * Create default mock assets for common test scenarios
 */
export function createDefaultMockAssets(): MockAssetPaths {
  return {
    'audioldm-s-full': '/mock/models/audioldm/audioldm-s-full-v2.ckpt',
    'wav2vec2-base': '/mock/models/wav2vec2/base/pytorch_model.bin',
    'xenakisldm-base': '/mock/models/xenakisldm/xenakisldm-base.ckpt',
    'gama-model-base': '/mock/models/gama/gama-model-base.pt',
    'test-audio-samples': '/mock/data/test-audio-samples.zip'
  };
}
