import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ModelContextStorage, ContextError } from './types';

interface SpecializedContextDB extends DBSchema {
  modelContexts: {
    key: string;
    value: ModelContextStorage;
    indexes: {
      'by-platform': string;
      'by-lastUsed': number;
    };
  };
}

/**
 * Handles persistent storage of model contexts using IndexedDB
 */
export class ContextStorageAdapter {
  private db: IDBPDatabase<SpecializedContextDB> | null = null;
  private readonly DB_NAME = 'specialized-context-db';
  private readonly DB_VERSION = 1;

  /**
   * Initialize the IndexedDB database
   */
  async init() {
    try {
      this.db = await openDB<SpecializedContextDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          const store = db.createObjectStore('modelContexts', {
            keyPath: 'modelId'
          });
          store.createIndex('by-platform', 'platform');
          store.createIndex('by-lastUsed', 'lastUsed');
        }
      });
    } catch (error) {
      console.error('Failed to initialize context storage:', error);
      throw new Error(ContextError.STORAGE_ERROR);
    }
  }

  /**
   * Store context for a specific model
   */
  async saveModelContext(context: ModelContextStorage): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    try {
      await this.db!.put('modelContexts', {
        ...context,
        version: context.version || 1
      });
    } catch (error) {
      console.error('Failed to save model context:', error);
      throw new Error(ContextError.STORAGE_ERROR);
    }
  }

  /**
   * Retrieve context for a specific model
   */
  async getModelContext(modelId: string): Promise<ModelContextStorage | null> {
    if (!this.db) {
      await this.init();
    }

    try {
      const result = await this.db!.get('modelContexts', modelId);
      return result || null; // Convert undefined to null
    } catch (error) {
      console.error('Failed to retrieve model context:', error);
      throw new Error(ContextError.STORAGE_ERROR);
    }
  }

  /**
   * Get all contexts for a specific platform
   */
  async getContextsByPlatform(platform: string): Promise<ModelContextStorage[]> {
    if (!this.db) {
      await this.init();
    }

    try {
      return await this.db!.getAllFromIndex('modelContexts', 'by-platform', platform);
    } catch (error) {
      console.error('Failed to retrieve contexts by platform:', error);
      throw new Error(ContextError.STORAGE_ERROR);
    }
  }

  /**
   * Delete context for a specific model
   */
  async deleteModelContext(modelId: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    try {
      await this.db!.delete('modelContexts', modelId);
    } catch (error) {
      console.error('Failed to delete model context:', error);
      throw new Error(ContextError.STORAGE_ERROR);
    }
  }

  /**
   * Clean up old contexts based on last used timestamp
   */
  async cleanupOldContexts(maxAge: number): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const cutoff = Date.now() - maxAge;
    const tx = this.db!.transaction('modelContexts', 'readwrite');
    const index = tx.store.index('by-lastUsed');

    let cursor = await index.openCursor();
    while (cursor) {
      if (cursor.value.lastUsed < cutoff) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}