import { ResourceRequest, Resource } from '../types';
import { PooledResource } from './types';

interface CacheItem {
  resource: PooledResource;
  lastAccessed: number;
}

export class PoolCache {
  private cache: Map<string, CacheItem>;
  private maxSize: number;
  private hits: number;
  private misses: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }

  public get(request: ResourceRequest): PooledResource | undefined {
    // Create cache key based on resource requirements
    const key = this.createCacheKey(request);
    const item = this.cache.get(key);

    if (item) {
      // Update last accessed time and hit count
      item.lastAccessed = Date.now();
      this.hits++;
      return item.resource;
    }

    this.misses++;
    return undefined;
  }

  public put(request: ResourceRequest, resource: PooledResource): void {
    const key = this.createCacheKey(request);

    // Evict oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      resource,
      lastAccessed: Date.now()
    });
  }

  public remove(request: ResourceRequest): void {
    const key = this.createCacheKey(request);
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }

  public getSize(): number {
    return this.cache.size;
  }

  private createCacheKey(request: ResourceRequest): string {
    // Create deterministic key based on request requirements
    const { type, requirements, constraints } = request;
    return JSON.stringify({
      type,
      requirements,
      constraints
    });
  }

  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestAccessed = Infinity;

    // Find least recently used item
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestAccessed) {
        oldestAccessed = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}