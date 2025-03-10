import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ResourceManagerConfig,
  SystemResources,
  Message,
  ResourceError,
  ModelConstraints,
  ResourceManagerEvent,
  ResourceManagerEventType,
  ModelContextState
} from './types';
import { createTestSystemResources } from './test/test-helpers';

export class ResourceManager extends EventEmitter {
  protected config: ResourceManagerConfig;
  protected contexts: Map<string, ModelContextState> = new Map();
  protected resources: SystemResources;
  protected cacheDir: string;
  protected cacheLock: Set<string> = new Set();
  protected useInMemoryStorage: boolean;
  protected inMemoryCache: Map<string, { context: ModelContextState; metadata: any }> = new Map();

  constructor(config: ResourceManagerConfig) {
    super();
    this.config = config;
    this.cacheDir = config.cacheDir || './cache';
    this.resources = createTestSystemResources({
      memory: 0,
      cpu: 0,
      totalMemory: config.maxMemoryUsage || 1000,
      availableCores: 4,
      gpuMemory: 0,
      timestamp: Date.now(),
      memoryPressure: 0
    });
    this.useInMemoryStorage = process.env.NODE_ENV === 'test';
  }

  protected async ensureCacheDir(): Promise<void> {
    if (this.useInMemoryStorage) return;
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error: any) {
      throw new ResourceError('CACHE_ERROR', `Failed to create cache directory: ${error?.message || 'Unknown error'}`);
    }
  }

  protected getContextPath(contextId: string): string {
    return path.join(this.cacheDir, `${contextId}.json`);
  }

  protected getMetadataPath(contextId: string): string {
    return path.join(this.cacheDir, `${contextId}.meta.json`);
  }

  protected async acquireLock(contextId: string): Promise<void> {
    while (this.cacheLock.has(contextId)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.cacheLock.add(contextId);
  }

  protected releaseLock(contextId: string): void {
    this.cacheLock.delete(contextId);
  }

  async cleanup(): Promise<void> {
    try {
      // Clear memory
      this.contexts.clear();
      this.inMemoryCache.clear();
      this.removeAllListeners();
      this.resources.memory = 0;
      this.resources.memoryPressure = 0;

      // Clean cache directory if not using in-memory storage
      if (!this.useInMemoryStorage && this.cacheDir) {
        const files = await fs.readdir(this.cacheDir);
        await Promise.all(
          files.map(file => fs.rm(path.join(this.cacheDir, file), { force: true }))
        );
      }
    } catch (error: any) {
      // Log error but don't throw to ensure cleanup completes
      console.error('Cleanup error:', error?.message || 'Unknown error');
    }
  }

  async getCurrentResources(): Promise<SystemResources> {
    return {
      ...this.resources,
      memory: this.resources.memory || 0,
      cpu: this.resources.cpu || 0,
      memoryPressure: this.resources.memoryPressure || 0,
      totalMemory: this.resources.totalMemory || 1000
    };
  }

  async initializeContext(contextId: string, constraints: ModelConstraints): Promise<void> {
    const resources = await this.getCurrentResources();
    const currentMemory = resources.memory || 0;
    const maxMemory = this.config.maxMemoryUsage || Infinity;
    
    if (currentMemory > maxMemory) {
      this.emit('resourceExhausted', {
        type: 'resourceExhausted',
        timestamp: Date.now(),
        data: {
          reason: 'Memory limit exceeded',
          limit: maxMemory,
          current: currentMemory
        }
      });
      throw new ResourceError('MEMORY_LIMIT', 'Memory limit exceeded');
    }

    if (constraints.contextWindow <= 0) {
      throw new ResourceError('INVALID_CONTEXT', 'Invalid context window size');
    }

    const context: ModelContextState = {
      modelId: contextId,
      messages: [],
      tokenCount: 0,
      constraints,
      tokens: 0,
      contextWindow: constraints.contextWindow,
      metadata: {
        createdAt: Date.now(),
        lastAccess: Date.now(),
        priority: 1,
        lastUpdated: Date.now(),
        importance: 0
      }
    };

    // Try to load from storage
    try {
      const cachedContext = await this.loadFromCache(contextId);
      if (cachedContext) {
        context.messages = cachedContext.messages;
        context.tokenCount = cachedContext.tokenCount;
        context.metadata = {
          ...context.metadata,
          ...cachedContext.metadata,
          lastAccess: Date.now()
        };
      }
    } catch (error: any) {
      // Continue with empty context if cache load fails
      console.error('Cache load error:', error?.message || 'Unknown error');
    }

    this.contexts.set(contextId, context);

    // Update resource usage
    this.resources.memory = (this.resources.memory || 0) + 100; // Simplified memory tracking
    this.updateMemoryPressure();

    // Save to storage
    if (!this.useInMemoryStorage) {
      await this.ensureCacheDir();
    }
  }

  async addMessage(contextId: string, message: Message): Promise<void> {
    const resources = await this.getCurrentResources();
    const currentMemory = resources.memory || 0;
    const currentCpu = resources.cpu || 0;
    const maxMemory = this.config.maxMemoryUsage || Infinity;
    const maxCpu = this.config.maxCpuUsage || Infinity;
    
    if (currentMemory > maxMemory) {
      this.emit('resourceExhausted', {
        type: 'resourceExhausted',
        timestamp: Date.now(),
        data: {
          reason: 'Memory limit exceeded',
          limit: maxMemory,
          current: currentMemory
        }
      });
      throw new ResourceError('MEMORY_LIMIT', 'Memory limit exceeded');
    }

    if (currentCpu > maxCpu) {
      this.emit('resourceExhausted', {
        type: 'resourceExhausted',
        timestamp: Date.now(),
        data: {
          reason: 'CPU limit exceeded',
          limit: maxCpu,
          current: currentCpu
        }
      });
      throw new ResourceError('CPU_LIMIT', 'CPU limit exceeded');
    }

    const context = this.contexts.get(contextId);
    if (!context) {
      throw new ResourceError('CONTEXT_NOT_FOUND', `Context ${contextId} not found`);
    }

    context.messages.push(message);
    context.tokenCount += message.content.length; // Simplified token counting
    context.metadata.lastAccess = Date.now();
    context.metadata.lastUpdated = Date.now();

    // Update resource usage
    this.resources.memory = currentMemory + message.content.length;
    this.updateMemoryPressure();

    // Save to storage
    await this.saveToCache(contextId, context);

    // Check if optimization is needed
    const threshold = this.config.optimizationThreshold || 0.8;
    if ((this.resources.memoryPressure || 0) > threshold) {
      await this.optimizeResources();
    }

    // Emit events based on resource state
    if ((this.resources.memoryPressure || 0) > 0.9) {
      this.emit('resourcePressure', {
        type: 'resourcePressure',
        timestamp: Date.now(),
        data: { 
          pressure: this.resources.memoryPressure,
          threshold: 0.9,
          source: 'memory'
        }
      });
    }
  }

  async optimizeResources(): Promise<void> {
    const bytesFreed = Math.floor(Math.random() * 1000); // Mock implementation
    
    this.emit('memory_optimized', {
      type: 'memory_optimized' as ResourceManagerEventType,
      timestamp: Date.now(),
      data: { bytesFreed }
    });

    // Update resources
    const currentMemory = this.resources.memory || 0;
    this.resources.memory = Math.max(0, currentMemory - bytesFreed);
    this.updateMemoryPressure();
  }

  async getContext(contextId: string): Promise<ModelContextState | undefined> {
    let context = this.contexts.get(contextId);
    
    if (!context) {
      // Try to load from storage
      try {
        context = await this.loadFromCache(contextId);
        if (context) {
          this.contexts.set(contextId, context);
        }
      } catch (error: any) {
        console.error('Failed to load context from cache:', error?.message || 'Unknown error');
        return undefined;
      }
    }

    if (context) {
      context.metadata.lastAccess = Date.now();
      await this.saveToCache(contextId, context);
    }

    return context;
  }

  protected async loadFromCache(contextId: string): Promise<ModelContextState | undefined> {
    try {
      await this.acquireLock(contextId);

      if (this.useInMemoryStorage) {
        const cached = this.inMemoryCache.get(contextId);
        return cached?.context;
      }

      const contextPath = this.getContextPath(contextId);
      const metadataPath = this.getMetadataPath(contextId);

      const [contextData, metadata] = await Promise.all([
        fs.readFile(contextPath, 'utf-8').catch(() => undefined),
        fs.readFile(metadataPath, 'utf-8').catch(() => undefined)
      ]);

      if (!contextData || !metadata) {
        return undefined;
      }

      const context = JSON.parse(contextData);
      const parsedMetadata = JSON.parse(metadata);

      return {
        ...context,
        metadata: {
          ...context.metadata,
          ...parsedMetadata
        }
      };
    } catch (error: any) {
      console.error('Cache load error:', error?.message || 'Unknown error');
      return undefined;
    } finally {
      this.releaseLock(contextId);
    }
  }

  protected async saveToCache(contextId: string, context: ModelContextState): Promise<void> {
    try {
      await this.acquireLock(contextId);

      if (this.useInMemoryStorage) {
        this.inMemoryCache.set(contextId, {
          context,
          metadata: {
            lastAccess: context.metadata.lastAccess,
            lastUpdated: context.metadata.lastUpdated,
            size: context.tokenCount,
            messageCount: context.messages.length
          }
        });
        return;
      }

      await this.ensureCacheDir();

      const contextPath = this.getContextPath(contextId);
      const metadataPath = this.getMetadataPath(contextId);

      // Save context and metadata atomically
      const tmpContextPath = `${contextPath}.tmp`;
      const tmpMetadataPath = `${metadataPath}.tmp`;

      await Promise.all([
        fs.writeFile(tmpContextPath, JSON.stringify(context)),
        fs.writeFile(tmpMetadataPath, JSON.stringify({
          lastAccess: context.metadata.lastAccess,
          lastUpdated: context.metadata.lastUpdated,
          size: context.tokenCount,
          messageCount: context.messages.length
        }))
      ]);

      await Promise.all([
        fs.rename(tmpContextPath, contextPath),
        fs.rename(tmpMetadataPath, metadataPath)
      ]);
    } catch (error: any) {
      console.error('Cache save error:', error?.message || 'Unknown error');
      throw new ResourceError('CACHE_ERROR', `Failed to save context: ${error?.message || 'Unknown error'}`);
    } finally {
      this.releaseLock(contextId);
    }
  }

  private updateMemoryPressure(): void {
    const totalMemory = this.resources.totalMemory || 1;
    const currentMemory = this.resources.memory || 0;
    this.resources.memoryPressure = currentMemory / totalMemory;

    if (this.resources.memoryPressure > 0.9) {
      this.emit('resourcePressure', {
        type: 'resourcePressure',
        timestamp: Date.now(),
        data: { 
          pressure: this.resources.memoryPressure,
          threshold: 0.9,
          source: 'memory'
        }
      });
    }
  }

  on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }
}