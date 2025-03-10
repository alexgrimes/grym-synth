/**
 * Asset Manager
 *
 * Handles external assets that are too large for the Git repository.
 * Provides functionality for:
 * - Checking if required assets exist locally
 * - Downloading missing assets from configurable remote sources
 * - Validating downloaded files with checksums
 * - Providing a consistent API for accessing these files
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { pipeline, Transform } from 'stream';
import { Readable } from 'stream';
import { Logger } from './logger';

// Create logger instance
const logger = new Logger('AssetManager');

// Node.js helpers
const fsPromises = fs.promises;
const pipelineAsync = promisify(pipeline);

// Types for asset configuration
export interface AssetConfig {
  id: string;
  name: string;
  description?: string;
  url: string;
  fallbackUrls?: string[];
  localPath: string;
  checksum: string;
  size?: number;
  version?: string;
  required: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface AssetManifest {
  version: string;
  created: string;
  updated: string;
  assets: AssetEntry[];
}

export interface AssetEntry {
  originalPath: string;
  storagePath: string;
  size: number;
  checksum: string;
  movedOn: string;
  required: boolean;
}

export interface AssetManagerOptions {
  configPath?: string;
  assetDir?: string;
  externalDir?: string;
  manifestPath?: string;
  cacheDir?: string;
  maxConcurrentDownloads?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  validateChecksums?: boolean;
  autoDownload?: boolean;
}

export interface DownloadProgress {
  assetId: string;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  status: 'pending' | 'downloading' | 'validating' | 'complete' | 'error';
  error?: Error;
}

export interface AssetStatus {
  id: string;
  exists: boolean;
  valid: boolean;
  path?: string;
  error?: string;
}

/**
 * AssetManager class for handling external assets
 */
export class AssetManager {
  private configPath: string;
  private assetDir: string;
  private externalDir: string;
  private manifestPath: string;
  private cacheDir: string;
  private maxConcurrentDownloads: number;
  private retryAttempts: number;
  private retryDelay: number;
  private timeout: number;
  private validateChecksums: boolean;
  private autoDownload: boolean;

  private assets: Map<string, AssetConfig> = new Map();
  private manifest: AssetManifest | null = null;
  private downloadQueue: Set<string> = new Set();
  private activeDownloads: Map<string, AbortController> = new Map();
  private progressCallbacks: Set<(progress: DownloadProgress) => void> = new Set();

  /**
   * Create a new AssetManager instance
   */
  constructor(options: AssetManagerOptions = {}) {
    // Set default options
    const rootDir = process.cwd();
    this.configPath = options.configPath || path.join(rootDir, 'config', 'assets.json');
    this.assetDir = options.assetDir || path.join(rootDir, 'assets');
    this.externalDir = options.externalDir || path.join(rootDir, '..', 'assets');
    this.manifestPath = options.manifestPath || path.join(this.externalDir, 'asset-manifest.json');
    this.cacheDir = options.cacheDir || path.join(rootDir, 'cache', 'assets');
    this.maxConcurrentDownloads = options.maxConcurrentDownloads || 3;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 30000;
    this.validateChecksums = options.validateChecksums !== false;
    this.autoDownload = options.autoDownload !== false;
  }

  /**
   * Initialize the asset manager
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await this.ensureDirectories();

      // Load asset configuration
      await this.loadAssetConfig();

      // Load asset manifest if it exists
      await this.loadManifest();

      logger.info(`AssetManager initialized with ${this.assets.size} assets configured`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize AssetManager', { errorDetails: error });
      throw new Error(`Failed to initialize AssetManager: ${errorMessage}`);
    }
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const dirs = [
      path.dirname(this.configPath),
      this.assetDir,
      this.externalDir,
      this.cacheDir
    ];

    for (const dir of dirs) {
      await fsPromises.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Load asset configuration from the config file
   */
  private async loadAssetConfig(): Promise<void> {
    try {
      if (!fs.existsSync(this.configPath)) {
        logger.warn(`Asset config file not found at ${this.configPath}, creating empty config`);
        await this.saveAssetConfig([]);
        return;
      }

      const configData = await fsPromises.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData);

      if (!Array.isArray(config.assets)) {
        throw new Error('Invalid asset configuration: assets must be an array');
      }

      // Clear existing assets
      this.assets.clear();

      // Add assets to the map
      for (const asset of config.assets) {
        if (!asset.id || !asset.url || !asset.localPath || !asset.checksum) {
          logger.warn(`Skipping invalid asset configuration: ${JSON.stringify(asset)}`);
          continue;
        }

        this.assets.set(asset.id, asset);
      }

      logger.info(`Loaded ${this.assets.size} assets from configuration`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load asset configuration', { errorDetails: error });
      throw new Error(`Failed to load asset configuration: ${errorMessage}`);
    }
  }

  /**
   * Save asset configuration to the config file
   */
  private async saveAssetConfig(assets: AssetConfig[]): Promise<void> {
    try {
      const config = {
        version: '1.0',
        updated: new Date().toISOString(),
        assets
      };

      await fsPromises.writeFile(
        this.configPath,
        JSON.stringify(config, null, 2),
        'utf8'
      );

      logger.info(`Saved asset configuration with ${assets.length} assets`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to save asset configuration', { errorDetails: error });
      throw new Error(`Failed to save asset configuration: ${errorMessage}`);
    }
  }

  /**
   * Load the asset manifest
   */
  private async loadManifest(): Promise<void> {
    try {
      if (!fs.existsSync(this.manifestPath)) {
        logger.info(`Asset manifest not found at ${this.manifestPath}`);
        this.manifest = null;
        return;
      }

      const manifestData = await fsPromises.readFile(this.manifestPath, 'utf8');
      this.manifest = JSON.parse(manifestData);

      if (this.manifest) {
        logger.info(`Loaded asset manifest with ${this.manifest.assets.length} entries`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load asset manifest', { errorDetails: error });
      this.manifest = null;
    }
  }

  /**
   * Check if an asset exists locally and is valid
   */
  public async checkAsset(assetId: string): Promise<AssetStatus> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return {
        id: assetId,
        exists: false,
        valid: false,
        error: `Asset not found in configuration: ${assetId}`
      };
    }

    // Check if the asset exists in the repository
    const repoPath = path.resolve(this.assetDir, asset.localPath);
    if (fs.existsSync(repoPath)) {
      const isValid = await this.validateAsset(repoPath, asset.checksum);
      return {
        id: assetId,
        exists: true,
        valid: isValid,
        path: repoPath,
        error: isValid ? undefined : 'Checksum validation failed'
      };
    }

    // Check if the asset exists in the external directory
    const externalPath = path.resolve(this.externalDir, asset.localPath);
    if (fs.existsSync(externalPath)) {
      const isValid = await this.validateAsset(externalPath, asset.checksum);
      return {
        id: assetId,
        exists: true,
        valid: isValid,
        path: externalPath,
        error: isValid ? undefined : 'Checksum validation failed'
      };
    }

    // Check if the asset exists in the manifest
    if (this.manifest) {
      const manifestEntry = this.manifest.assets.find(
        entry => entry.originalPath === asset.localPath
      );

      if (manifestEntry) {
        const manifestPath = path.resolve(this.externalDir, manifestEntry.storagePath);
        if (fs.existsSync(manifestPath)) {
          const isValid = await this.validateAsset(manifestPath, manifestEntry.checksum);
          return {
            id: assetId,
            exists: true,
            valid: isValid,
            path: manifestPath,
            error: isValid ? undefined : 'Checksum validation failed'
          };
        }
      }
    }

    return {
      id: assetId,
      exists: false,
      valid: false,
      error: `Asset not found locally: ${assetId}`
    };
  }

  /**
   * Validate an asset's checksum
   */
  private async validateAsset(filePath: string, expectedChecksum: string): Promise<boolean> {
    if (!this.validateChecksums) {
      return true;
    }

    try {
      const fileStream = fs.createReadStream(filePath);
      const hash = createHash('sha256');

      await new Promise<void>((resolve, reject) => {
        fileStream.on('error', reject);
        fileStream.on('data', chunk => hash.update(chunk));
        fileStream.on('end', () => resolve());
      });

      const actualChecksum = hash.digest('hex');
      return actualChecksum === expectedChecksum;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to validate asset: ${filePath}`, { errorDetails: error });
      return false;
    }
  }

  /**
   * Get the path to an asset, downloading it if necessary
   */
  public async getAssetPath(assetId: string): Promise<string> {
    const status = await this.checkAsset(assetId);

    if (status.exists && status.valid && status.path) {
      return status.path;
    }

    if (this.autoDownload) {
      logger.info(`Asset ${assetId} not found locally or invalid, downloading...`);
      return this.downloadAsset(assetId);
    }

    throw new Error(`Asset ${assetId} not found locally and auto-download is disabled`);
  }

  /**
   * Download an asset
   */
  public async downloadAsset(assetId: string): Promise<string> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found in configuration: ${assetId}`);
    }

    // Add to download queue if not already downloading
    if (this.activeDownloads.has(assetId)) {
      logger.info(`Asset ${assetId} is already being downloaded`);

      // Wait for the download to complete
      return new Promise<string>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!this.activeDownloads.has(assetId)) {
            clearInterval(checkInterval);
            this.checkAsset(assetId)
              .then(status => {
                if (status.exists && status.valid && status.path) {
                  resolve(status.path);
                } else {
                  reject(new Error(`Failed to download asset ${assetId}`));
                }
              })
              .catch(reject);
          }
        }, 500);
      });
    }

    this.downloadQueue.add(assetId);
    await this.processDownloadQueue();

    // Check if the asset was downloaded successfully
    const status = await this.checkAsset(assetId);
    if (status.exists && status.valid && status.path) {
      return status.path;
    }

    throw new Error(`Failed to download asset ${assetId}`);
  }

  /**
   * Process the download queue
   */
  private async processDownloadQueue(): Promise<void> {
    // Process downloads up to the maximum concurrent limit
    const availableSlots = this.maxConcurrentDownloads - this.activeDownloads.size;
    if (availableSlots <= 0 || this.downloadQueue.size === 0) {
      return;
    }

    // Get the next batch of assets to download
    const batch = Array.from(this.downloadQueue).slice(0, availableSlots);

    // Remove from queue
    for (const assetId of batch) {
      this.downloadQueue.delete(assetId);
    }

    // Start downloads
    const downloadPromises = batch.map(assetId => this.startDownload(assetId));

    // Wait for all downloads to complete
    await Promise.allSettled(downloadPromises);

    // Process the next batch if there are more in the queue
    if (this.downloadQueue.size > 0) {
      await this.processDownloadQueue();
    }
  }

  /**
   * Start downloading an asset
   */
  private async startDownload(assetId: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found in configuration: ${assetId}`);
    }

    const targetDir = path.dirname(path.resolve(this.assetDir, asset.localPath));
    await fsPromises.mkdir(targetDir, { recursive: true });

    const targetPath = path.resolve(this.assetDir, asset.localPath);
    const tempPath = `${targetPath}.download`;

    // Create abort controller for this download
    const abortController = new AbortController();
    this.activeDownloads.set(assetId, abortController);

    try {
      // Update progress
      this.updateProgress({
        assetId,
        bytesDownloaded: 0,
        totalBytes: asset.size || 0,
        percentage: 0,
        status: 'pending'
      });

      // Try to download with retries
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          await this.downloadFile(asset.url, tempPath, assetId, abortController);
          break;
        } catch (error: unknown) {
          if (attempt === this.retryAttempts) {
            throw error;
          }

          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(`Download attempt ${attempt} failed for ${assetId}, retrying...`, { errorDetails: error });
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }

      // Validate the downloaded file
      this.updateProgress({
        assetId,
        bytesDownloaded: asset.size || 0,
        totalBytes: asset.size || 0,
        percentage: 100,
        status: 'validating'
      });

      const isValid = await this.validateAsset(tempPath, asset.checksum);
      if (!isValid) {
        throw new Error(`Checksum validation failed for ${assetId}`);
      }

      // Move the file to its final location
      await fsPromises.rename(tempPath, targetPath);

      // Update progress
      this.updateProgress({
        assetId,
        bytesDownloaded: asset.size || 0,
        totalBytes: asset.size || 0,
        percentage: 100,
        status: 'complete'
      });

      logger.info(`Successfully downloaded asset ${assetId} to ${targetPath}`);
    } catch (error: unknown) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        await fsPromises.unlink(tempPath).catch(() => {});
      }

      // Update progress with error
      const downloadError = error instanceof Error ? error : new Error(String(error));
      this.updateProgress({
        assetId,
        bytesDownloaded: 0,
        totalBytes: asset.size || 0,
        percentage: 0,
        status: 'error',
        error: downloadError
      });

      logger.error(`Failed to download asset ${assetId}`, { errorDetails: error });
      throw error;
    } finally {
      // Remove from active downloads
      this.activeDownloads.delete(assetId);
    }
  }

  /**
   * Download a file from a URL
   */
  private async downloadFile(
    url: string,
    targetPath: string,
    assetId: string,
    abortController: AbortController
  ): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found in configuration: ${assetId}`);
    }

    // Use Node.js fetch API
    const response = await fetch(url, {
      signal: abortController.signal,
      headers: {
        'User-Agent': 'AssetManager/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const totalBytes = parseInt(response.headers.get('content-length') || '0', 10) || asset.size || 0;
    let bytesDownloaded = 0;

    // Create write stream
    const fileStream = fs.createWriteStream(targetPath);

    // Create transform stream to track progress
    const progressStream = new Transform({
      transform: (chunk: Buffer, _encoding: string, callback: (error: Error | null, data: Buffer) => void) => {
        bytesDownloaded += chunk.length;

        // Update progress
        this.updateProgress({
          assetId,
          bytesDownloaded,
          totalBytes,
          percentage: totalBytes ? Math.round((bytesDownloaded / totalBytes) * 100) : 0,
          status: 'downloading'
        });

        callback(null, chunk);
      }
    });

    // Pipe the response to the file
    if (response.body) {
      // Convert Web API ReadableStream to Node.js Readable
      const responseStream = Readable.fromWeb(response.body as any);
      await pipelineAsync(
        responseStream,
        progressStream,
        fileStream
      );
    } else {
      throw new Error('Response body is null');
    }
  }

  /**
   * Update download progress and notify listeners
   */
  private updateProgress(progress: DownloadProgress): void {
    for (const callback of this.progressCallbacks) {
      try {
        callback(progress);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error in progress callback', { errorDetails: error });
      }
    }
  }

  /**
   * Register a progress callback
   */
  public onProgress(callback: (progress: DownloadProgress) => void): () => void {
    this.progressCallbacks.add(callback);

    // Return a function to unregister the callback
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Check all required assets
   */
  public async checkAllAssets(): Promise<AssetStatus[]> {
    const results: AssetStatus[] = [];

    for (const [assetId, asset] of this.assets.entries()) {
      const status = await this.checkAsset(assetId);
      results.push(status);

      if (asset.required && (!status.exists || !status.valid)) {
        logger.warn(`Required asset ${assetId} is missing or invalid`);
      }
    }

    return results;
  }

  /**
   * Download all required assets
   */
  public async downloadRequiredAssets(): Promise<void> {
    const requiredAssets = Array.from(this.assets.entries())
      .filter(([, asset]) => asset.required)
      .map(([assetId]) => assetId);

    if (requiredAssets.length === 0) {
      logger.info('No required assets to download');
      return;
    }

    logger.info(`Downloading ${requiredAssets.length} required assets...`);

    // Add all required assets to the download queue
    for (const assetId of requiredAssets) {
      const status = await this.checkAsset(assetId);
      if (!status.exists || !status.valid) {
        this.downloadQueue.add(assetId);
      }
    }

    // Process the download queue
    await this.processDownloadQueue();

    logger.info('Finished downloading required assets');
  }

  /**
   * Add a new asset to the configuration
   */
  public async addAsset(asset: AssetConfig): Promise<void> {
    if (this.assets.has(asset.id)) {
      throw new Error(`Asset with ID ${asset.id} already exists`);
    }

    this.assets.set(asset.id, asset);

    // Save the updated configuration
    await this.saveAssetConfig(Array.from(this.assets.values()));
  }

  /**
   * Remove an asset from the configuration
   */
  public async removeAsset(assetId: string): Promise<void> {
    if (!this.assets.has(assetId)) {
      throw new Error(`Asset with ID ${assetId} not found`);
    }

    this.assets.delete(assetId);

    // Save the updated configuration
    await this.saveAssetConfig(Array.from(this.assets.values()));
  }

  /**
   * Get all configured assets
   */
  public getAssets(): AssetConfig[] {
    return Array.from(this.assets.values());
  }

  /**
   * Get a specific asset configuration
   */
  public getAsset(assetId: string): AssetConfig | undefined {
    return this.assets.get(assetId);
  }

  /**
   * Restore an asset from the external directory to its original location
   */
  public async restoreAsset(assetPath: string): Promise<void> {
    if (!this.manifest) {
      throw new Error('Asset manifest not found');
    }

    // Normalize the path to match the manifest
    const normalizedPath = path.normalize(assetPath).replace(/\\/g, '/');

    // Find the asset in the manifest
    const assetEntry = this.manifest.assets.find(
      entry => entry.originalPath === normalizedPath
    );

    if (!assetEntry) {
      throw new Error(`Asset not found in manifest: ${assetPath}`);
    }

    // Source path in the external directory
    const sourcePath = path.resolve(this.externalDir, assetEntry.storagePath);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Asset not found in external directory: ${sourcePath}`);
    }

    // Target path in the repository
    const targetPath = path.resolve(process.cwd(), assetEntry.originalPath);
    const targetDir = path.dirname(targetPath);

    // Ensure the target directory exists
    await fsPromises.mkdir(targetDir, { recursive: true });

    // Copy the file
    await fsPromises.copyFile(sourcePath, targetPath);

    // Validate the copied file
    const isValid = await this.validateAsset(targetPath, assetEntry.checksum);
    if (!isValid) {
      // Clean up the invalid file
      await fsPromises.unlink(targetPath).catch(() => {});
      throw new Error(`Checksum validation failed for restored asset: ${assetPath}`);
    }

    logger.info(`Successfully restored asset ${assetPath} to ${targetPath}`);
  }
}

// Export a singleton instance
export const assetManager = new AssetManager();

// Export a function to get the asset manager instance
export function getAssetManager(options?: AssetManagerOptions): AssetManager {
  return new AssetManager(options);
}
