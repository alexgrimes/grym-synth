import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

export interface Pattern {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  createdAt: number;
  modifiedAt: number;
  starred: boolean;
  usageCount: number;
  parameters: Record<string, number>;
  analysisData?: Record<string, any>;
}

interface DBParameter {
  parameter_id: string;
  value: number;
}

interface DBAnalysis {
  analysis_type: string;
  analysis_data: string;
}

interface DBPattern {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tags: string;
  created_at: number;
  modified_at: number;
  starred: number;
  usage_count: number;
}

interface DBResult {
  changes?: number;
  lastID?: number;
}

export class PatternLibrary {
  private db: Database | null = null;
  private initialized = false;
  private dbPath: string;

  constructor(dbPath: string = 'data/patterns.db') {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Open database with sqlite
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Run migrations to ensure schema is up to date
      await this.db.exec(`
        -- Create tables if they don't exist
        CREATE TABLE IF NOT EXISTS patterns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL,
          tags TEXT,  -- JSON array of tags
          created_at INTEGER NOT NULL,
          modified_at INTEGER NOT NULL,
          starred INTEGER DEFAULT 0,
          usage_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS pattern_parameters (
          pattern_id TEXT NOT NULL,
          parameter_id TEXT NOT NULL,
          value REAL NOT NULL,
          PRIMARY KEY (pattern_id, parameter_id),
          FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS pattern_analysis (
          pattern_id TEXT NOT NULL,
          analysis_type TEXT NOT NULL,
          analysis_data TEXT NOT NULL, -- JSON data
          PRIMARY KEY (pattern_id, analysis_type),
          FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
        );

        -- Indexes for efficient retrieval
        CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);
        CREATE INDEX IF NOT EXISTS idx_patterns_tags ON patterns(tags);
        CREATE INDEX IF NOT EXISTS idx_patterns_starred ON patterns(starred);
      `);

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize pattern library: ${(error as Error).message}`);
    }
  }

  async savePattern(pattern: Pattern): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('BEGIN TRANSACTION');

    try {
      // Insert or update pattern
      await this.db.run(
        `INSERT OR REPLACE INTO patterns (
          id, name, description, category, tags,
          created_at, modified_at, starred, usage_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pattern.id,
          pattern.name,
          pattern.description || null,
          pattern.category,
          JSON.stringify(pattern.tags),
          pattern.createdAt,
          pattern.modifiedAt,
          pattern.starred ? 1 : 0,
          pattern.usageCount
        ]
      );

      // Delete existing parameters and insert new ones
      await this.db.run(
        'DELETE FROM pattern_parameters WHERE pattern_id = ?',
        pattern.id
      );

      for (const [paramId, value] of Object.entries(pattern.parameters)) {
        await this.db.run(
          'INSERT INTO pattern_parameters (pattern_id, parameter_id, value) VALUES (?, ?, ?)',
          [pattern.id, paramId, value]
        );
      }

      // Handle analysis data if present
      if (pattern.analysisData) {
        await this.db.run(
          'DELETE FROM pattern_analysis WHERE pattern_id = ?',
          pattern.id
        );

        for (const [analysisType, data] of Object.entries(pattern.analysisData)) {
          await this.db.run(
            'INSERT INTO pattern_analysis (pattern_id, analysis_type, analysis_data) VALUES (?, ?, ?)',
            [pattern.id, analysisType, JSON.stringify(data)]
          );
        }
      }

      await this.db.run('COMMIT');
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  async getPattern(id: string): Promise<Pattern | null> {
    const db = this.db;
    if (!db) throw new Error('Database not initialized');

    // Get pattern basic data
    const pattern = await db.get<DBPattern>(
      'SELECT * FROM patterns WHERE id = ?',
      id
    );

    if (!pattern) return null;

    // Get parameters
    const parameters = await db.all<DBParameter[]>(
      'SELECT parameter_id, value FROM pattern_parameters WHERE pattern_id = ?',
      id
    ) || [];

    // Get analysis data
    const analysisEntries = await db.all<DBAnalysis[]>(
      'SELECT analysis_type, analysis_data FROM pattern_analysis WHERE pattern_id = ?',
      id
    ) || [];

    return {
      id: pattern.id,
      name: pattern.name,
      description: pattern.description || undefined,
      category: pattern.category,
      tags: JSON.parse(pattern.tags),
      createdAt: pattern.created_at,
      modifiedAt: pattern.modified_at,
      starred: Boolean(pattern.starred),
      usageCount: pattern.usage_count,
      parameters: Object.fromEntries(
        parameters.map(p => [p.parameter_id, p.value])
      ),
      analysisData: Object.fromEntries(
        analysisEntries.map(a => [a.analysis_type, JSON.parse(a.analysis_data)])
      )
    };
  }

  async searchPatterns(options: {
    category?: string;
    tags?: string[];
    starred?: boolean;
    query?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Pattern[]> {
    const db = this.db;
    if (!db) throw new Error('Database not initialized');

    let whereConditions: string[] = ['1 = 1'];
    const params: any[] = [];

    if (options.category) {
      whereConditions.push('category = ?');
      params.push(options.category);
    }

    if (options.tags?.length) {
      const tagConditions = options.tags.map(tag => 'tags LIKE ?');
      whereConditions.push(`(${tagConditions.join(' OR ')})`);
      params.push(...options.tags.map(tag => `%${tag}%`));
    }

    if (options.starred !== undefined) {
      whereConditions.push('starred = ?');
      params.push(options.starred ? 1 : 0);
    }

    if (options.query) {
      whereConditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${options.query}%`, `%${options.query}%`);
    }

    const patterns = await db.all<DBPattern[]>(
      `SELECT * FROM patterns
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY modified_at DESC
       LIMIT ? OFFSET ?`,
      [...params, options.limit || 100, options.offset || 0]
    ) || [];

    // Fetch parameters and analysis data for each pattern
    return Promise.all(
      patterns.map(async pattern => {
        const parameters = await db.all<DBParameter[]>(
          'SELECT parameter_id, value FROM pattern_parameters WHERE pattern_id = ?',
          pattern.id
        ) || [];

        const analysisEntries = await db.all<DBAnalysis[]>(
          'SELECT analysis_type, analysis_data FROM pattern_analysis WHERE pattern_id = ?',
          pattern.id
        ) || [];

        return {
          id: pattern.id,
          name: pattern.name,
          description: pattern.description || undefined,
          category: pattern.category,
          tags: JSON.parse(pattern.tags),
          createdAt: pattern.created_at,
          modifiedAt: pattern.modified_at,
          starred: Boolean(pattern.starred),
          usageCount: pattern.usage_count,
          parameters: Object.fromEntries(
            parameters.map(p => [p.parameter_id, p.value])
          ),
          analysisData: Object.fromEntries(
            analysisEntries.map(a => [a.analysis_type, JSON.parse(a.analysis_data)])
          )
        };
      })
    );
  }

  async deletePattern(id: string): Promise<boolean> {
    const db = this.db;
    if (!db) throw new Error('Database not initialized');

    const result = await db.run('DELETE FROM patterns WHERE id = ?', id) as DBResult;
    return (result.changes ?? 0) > 0;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}
