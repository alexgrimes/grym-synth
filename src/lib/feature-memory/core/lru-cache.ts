export class LRUCache<K, V> {
  private cache: Map<K, V>;
  protected maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value === undefined) {
      this.misses++;
      return undefined;
    }

    this.hits++;
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used item (first item)
      const firstKey = this.cache.keys().next();
      if (!firstKey.done) {
        this.cache.delete(firstKey.value);
      }
    }
    this.cache.set(key, value);
  }

  /**
   * Delete a value from the cache
   */
  delete(key: K): void {
    this.cache.delete(key);
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get the cache hit rate
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get the maximum size of the cache
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all keys in the cache
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * Get all values in the cache
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }

  /**
   * Resize the cache to a new maximum size
   * If the new size is smaller, remove least recently used items
   */
  resize(newMaxSize: number): void {
    if (newMaxSize < 0) {
      throw new Error("Cache size cannot be negative");
    }

    this.maxSize = newMaxSize;

    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next();
      if (!firstKey.done) {
        this.cache.delete(firstKey.value);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    hits: number;
    misses: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.getHitRate(),
      hits: this.hits,
      misses: this.misses,
    };
  }
}
