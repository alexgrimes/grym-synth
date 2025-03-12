import { promises as fs } from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export interface Resource {
  id: string;
  type: string;
  path: string;
  metadata: Record<string, any>;
}

interface ResourceRow {
  id: string;
  type: string;
  path: string;
  metadata: string;
}

export class ResourceManager {
  private db: any;
  private initialized: boolean = false;

  constructor(private dbPath: string = ':memory:') {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        path TEXT NOT NULL,
        metadata TEXT
      )
    `);

    this.initialized = true;
  }

  async addResource(resource: Omit<Resource, 'id'>): Promise<string> {
    if (!this.initialized) await this.initialize();

    const id = Math.random().toString(36).substring(2, 15);
    await this.db.run(
      'INSERT INTO resources (id, type, path, metadata) VALUES (?, ?, ?, ?)',
      [id, resource.type, resource.path, JSON.stringify(resource.metadata)]
    );

    return id;
  }

  async getResource(id: string): Promise<Resource | null> {
    if (!this.initialized) await this.initialize();

    const resource = await this.db.get('SELECT * FROM resources WHERE id = ?', [id]) as ResourceRow | undefined;
    if (!resource) return null;

    return {
      ...resource,
      metadata: JSON.parse(resource.metadata)
    };
  }

  async listResources(type?: string): Promise<Resource[]> {
    if (!this.initialized) await this.initialize();

    const query = type
      ? 'SELECT * FROM resources WHERE type = ?'
      : 'SELECT * FROM resources';

    const resources = await this.db.all(query, type ? [type] : []) as ResourceRow[];
    return resources.map(resource => ({
      ...resource,
      metadata: JSON.parse(resource.metadata)
    }));
  }

  async updateResource(id: string, updates: Partial<Omit<Resource, 'id'>>): Promise<boolean> {
    if (!this.initialized) await this.initialize();

    const sets: string[] = [];
    const values: any[] = [];

    if (updates.type) {
      sets.push('type = ?');
      values.push(updates.type);
    }
    if (updates.path) {
      sets.push('path = ?');
      values.push(updates.path);
    }
    if (updates.metadata) {
      sets.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    if (sets.length === 0) return false;

    values.push(id);
    const result = await this.db.run(
      `UPDATE resources SET ${sets.join(', ')} WHERE id = ?`,
      values
    );

    return result.changes > 0;
  }

  async deleteResource(id: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();

    const result = await this.db.run('DELETE FROM resources WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.initialized = false;
    }
  }
}

export default ResourceManager;
