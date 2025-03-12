import { openDB, IDBPDatabase } from 'idb';
import { Pattern, PatternLibrary } from './pattern-library';
import { nanoid } from 'nanoid';

export interface MigrationResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface MigrationProgress {
  current: number;
  total: number;
  status: string;
}

export class PatternMigrationUtility {
  private patternLibrary: PatternLibrary;

  constructor(patternLibrary: PatternLibrary) {
    this.patternLibrary = patternLibrary;
  }

  async migrateFromIndexedDB(
    dbName: string = 'grymsynth-patterns',
    storeName: string = 'patterns',
    progressCallback?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    // Ensure pattern library is initialized
    await this.patternLibrary.initialize();

    // Open IndexedDB
    const db = await this.openIndexedDB(dbName, storeName);
    const patterns = await this.getAllPatterns(db, storeName);
    const total = patterns.length;

    let success = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Migrate each pattern
    for (let i = 0; i < patterns.length; i++) {
      const indexedDBPattern = patterns[i];

      try {
        // Convert IndexedDB pattern to SQLite pattern format
        const pattern = await this.convertPattern(indexedDBPattern);

        // Save to SQLite
        await this.patternLibrary.savePattern(pattern);
        success++;

        // Report progress
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total,
            status: `Successfully migrated pattern: ${pattern.name}`
          });
        }
      } catch (error) {
        failed++;
        errors.push({
          id: indexedDBPattern.id || 'unknown',
          error: (error as Error).message
        });

        // Report error progress
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total,
            status: `Failed to migrate pattern: ${(error as Error).message}`
          });
        }
      }
    }

    // Close IndexedDB connection
    db.close();

    return { success, failed, errors };
  }

  private async openIndexedDB(dbName: string, storeName: string): Promise<IDBPDatabase> {
    try {
      return await openDB(dbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        },
      });
    } catch (error) {
      throw new Error(`Failed to open IndexedDB: ${(error as Error).message}`);
    }
  }

  private async getAllPatterns(db: IDBPDatabase, storeName: string): Promise<any[]> {
    try {
      return await db.getAll(storeName);
    } catch (error) {
      throw new Error(`Failed to get patterns from IndexedDB: ${(error as Error).message}`);
    }
  }

  private async convertPattern(indexedDBPattern: any): Promise<Pattern> {
    // Validate required fields
    if (!indexedDBPattern.id || !indexedDBPattern.name || !indexedDBPattern.category) {
      throw new Error('Invalid pattern data: missing required fields');
    }

    // Convert timestamps
    const now = Date.now();
    const createdAt = indexedDBPattern.createdAt || now;
    const modifiedAt = indexedDBPattern.modifiedAt || now;

    // Convert parameters
    const parameters: Record<string, number> = {};
    if (indexedDBPattern.parameters) {
      for (const [key, value] of Object.entries(indexedDBPattern.parameters)) {
        if (typeof value === 'number') {
          parameters[key] = value;
        } else if (typeof value === 'string') {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            parameters[key] = num;
          }
        }
      }
    }

    // Create SQLite pattern
    return {
      id: indexedDBPattern.id,
      name: indexedDBPattern.name,
      description: indexedDBPattern.description,
      category: indexedDBPattern.category,
      tags: Array.isArray(indexedDBPattern.tags) ? indexedDBPattern.tags : [],
      createdAt,
      modifiedAt,
      starred: Boolean(indexedDBPattern.starred),
      usageCount: typeof indexedDBPattern.usageCount === 'number' ? indexedDBPattern.usageCount : 0,
      parameters,
      analysisData: indexedDBPattern.analysisData || {}
    };
  }

  async validateMigration(dbName: string, storeName: string): Promise<{
    totalPatterns: number;
    migratedPatterns: number;
    missingPatterns: string[];
  }> {
    // Get all patterns from IndexedDB
    const db = await this.openIndexedDB(dbName, storeName);
    const indexedDBPatterns = await this.getAllPatterns(db, storeName);
    db.close();

    const missingPatterns: string[] = [];
    let migratedPatterns = 0;

    // Check each pattern
    for (const indexedDBPattern of indexedDBPatterns) {
      const sqlitePattern = await this.patternLibrary.getPattern(indexedDBPattern.id);
      if (sqlitePattern) {
        migratedPatterns++;
      } else {
        missingPatterns.push(indexedDBPattern.id);
      }
    }

    return {
      totalPatterns: indexedDBPatterns.length,
      migratedPatterns,
      missingPatterns
    };
  }

  async retryFailedMigrations(
    failedPatternIds: string[],
    dbName: string,
    storeName: string,
    progressCallback?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    const db = await this.openIndexedDB(dbName, storeName);
    const total = failedPatternIds.length;
    let success = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < failedPatternIds.length; i++) {
      const patternId = failedPatternIds[i];
      try {
        const indexedDBPattern = await db.get(storeName, patternId);
        if (!indexedDBPattern) {
          throw new Error('Pattern not found in IndexedDB');
        }

        const pattern = await this.convertPattern(indexedDBPattern);
        await this.patternLibrary.savePattern(pattern);
        success++;

        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total,
            status: `Successfully migrated pattern: ${pattern.name}`
          });
        }
      } catch (error) {
        failed++;
        errors.push({
          id: patternId,
          error: (error as Error).message
        });

        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total,
            status: `Failed to migrate pattern: ${(error as Error).message}`
          });
        }
      }
    }

    db.close();
    return { success, failed, errors };
  }
}
