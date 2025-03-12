import { nanoid } from 'nanoid';
import { SpectroMorphAnalysis } from '../../types/AudioAnalysis';

export interface AudioPattern {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  tags: string[];
  spectralAnalysis: SpectroMorphAnalysis;
  parameters: Record<string, number>;
  waveform: number[];  // Simplified representation of the waveform
  thumbnail: string;   // Base64 image data for thumbnail
  created: number;     // Timestamp
  modified: number;    // Timestamp
  starred: boolean;
  usageCount: number;
}

export type PatternCategory =
  | 'stochastic'
  | 'granular'
  | 'spectral'
  | 'textural'
  | 'rhythmic'
  | 'harmonic'
  | 'atmospheric'
  | 'custom';

export interface PatternFilter {
  categories?: PatternCategory[];
  tags?: string[];
  starred?: boolean;
  searchQuery?: string;
  sortBy?: 'name' | 'created' | 'modified' | 'usageCount';
  sortDirection?: 'asc' | 'desc';
}

export interface CreatePatternOptions {
  name: string;
  description?: string;
  category: PatternCategory;
  tags?: string[];
  spectralAnalysis: SpectroMorphAnalysis;
  parameters: Record<string, number>;
  waveform: number[];
  thumbnail?: string;
}

export class PatternLibrary {
  private patterns: Map<string, AudioPattern> = new Map();
  private storage: PatternStorage;

  constructor() {
    this.storage = new PatternStorage();
    this.loadPatterns();
  }

  async loadPatterns(): Promise<void> {
    try {
      const storedPatterns = await this.storage.loadPatterns();
      this.patterns.clear();

      storedPatterns.forEach(pattern => {
        this.patterns.set(pattern.id, pattern);
      });

      console.log(`Loaded ${this.patterns.size} patterns from storage`);
    } catch (error) {
      console.error('Error loading patterns:', error);
      // Initialize with empty patterns
    }
  }

  async savePattern(options: CreatePatternOptions): Promise<string> {
    const id = nanoid();
    const now = Date.now();

    const newPattern: AudioPattern = {
      id,
      name: options.name,
      description: options.description || '',
      category: options.category,
      tags: options.tags || [],
      spectralAnalysis: options.spectralAnalysis,
      parameters: options.parameters,
      waveform: options.waveform,
      thumbnail: options.thumbnail || this.generateThumbnail(options.waveform),
      created: now,
      modified: now,
      starred: false,
      usageCount: 0
    };

    // Add to local cache
    this.patterns.set(id, newPattern);

    // Save to storage
    await this.storage.savePattern(newPattern);

    return id;
  }

  async getPattern(id: string): Promise<AudioPattern | null> {
    return this.patterns.get(id) || null;
  }

  async updatePattern(id: string, updates: Partial<AudioPattern>): Promise<boolean> {
    const pattern = this.patterns.get(id);
    if (!pattern) return false;

    // Apply updates
    const updatedPattern: AudioPattern = {
      ...pattern,
      ...updates,
      modified: Date.now()
    };

    // Update local cache
    this.patterns.set(id, updatedPattern);

    // Save to storage
    await this.storage.savePattern(updatedPattern);

    return true;
  }

  async deletePattern(id: string): Promise<boolean> {
    if (!this.patterns.has(id)) return false;

    // Remove from local cache
    this.patterns.delete(id);

    // Remove from storage
    await this.storage.deletePattern(id);

    return true;
  }

  async starPattern(id: string, starred: boolean): Promise<boolean> {
    return this.updatePattern(id, { starred });
  }

  async incrementUsage(id: string): Promise<boolean> {
    const pattern = this.patterns.get(id);
    if (!pattern) return false;

    return this.updatePattern(id, {
      usageCount: pattern.usageCount + 1
    });
  }

  getPatterns(filter?: PatternFilter): AudioPattern[] {
    let result = Array.from(this.patterns.values());

    // Apply filters
    if (filter) {
      // Filter by categories
      if (filter.categories && filter.categories.length > 0) {
        result = result.filter(p => filter.categories!.includes(p.category));
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        result = result.filter(p =>
          filter.tags!.some(tag => p.tags.includes(tag))
        );
      }

      // Filter by starred
      if (filter.starred !== undefined) {
        result = result.filter(p => p.starred === filter.starred);
      }

      // Filter by search query
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        result = result.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      // Sort results
      if (filter.sortBy) {
        const direction = filter.sortDirection === 'desc' ? -1 : 1;

        result.sort((a, b) => {
          switch (filter.sortBy) {
            case 'name':
              return direction * a.name.localeCompare(b.name);
            case 'created':
              return direction * (a.created - b.created);
            case 'modified':
              return direction * (a.modified - b.modified);
            case 'usageCount':
              return direction * (a.usageCount - b.usageCount);
            default:
              return 0;
          }
        });
      }
    }

    return result;
  }

  getCategories(): string[] {
    const categories = new Set<string>();

    this.patterns.forEach(pattern => {
      categories.add(pattern.category);
    });

    return Array.from(categories);
  }

  getTags(): string[] {
    const tags = new Set<string>();

    this.patterns.forEach(pattern => {
      pattern.tags.forEach(tag => tags.add(tag));
    });

    return Array.from(tags);
  }

  private generateThumbnail(waveform: number[]): string {
    // In a real implementation, this would generate a proper thumbnail
    // For now, we'll return a placeholder
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

class PatternStorage {
  private readonly STORAGE_KEY = 'grymsynth_patterns';

  async loadPatterns(): Promise<AudioPattern[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];

      return JSON.parse(data) as AudioPattern[];
    } catch (error) {
      console.error('Error loading patterns from storage:', error);
      return [];
    }
  }

  async savePattern(pattern: AudioPattern): Promise<void> {
    try {
      // Load existing patterns
      const patterns = await this.loadPatterns();

      // Find and replace pattern if it exists, otherwise add it
      const existingIndex = patterns.findIndex(p => p.id === pattern.id);
      if (existingIndex >= 0) {
        patterns[existingIndex] = pattern;
      } else {
        patterns.push(pattern);
      }

      // Save updated patterns list
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(patterns));
    } catch (error) {
      console.error('Error saving pattern to storage:', error);
      throw error;
    }
  }

  async deletePattern(id: string): Promise<void> {
    try {
      // Load existing patterns
      const patterns = await this.loadPatterns();

      // Filter out the pattern to delete
      const updatedPatterns = patterns.filter(p => p.id !== id);

      // Save updated patterns list
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPatterns));
    } catch (error) {
      console.error('Error deleting pattern from storage:', error);
      throw error;
    }
  }
}
