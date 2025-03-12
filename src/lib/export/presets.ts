interface ExportPreset {
  id: string;
  name: string;
  description: string;
  settings: ExportSettings;
}

interface ExportSettings {
  format: 'wav' | 'mp3' | 'ogg' | 'flac';
  sampleRate: 44100 | 48000 | 96000;
  bitDepth?: 16 | 24 | 32;
  channels: 1 | 2;
  normalization: boolean;
  dithering: boolean;
  compression?: {
    enabled: boolean;
    quality: number; // 0-100
  };
  metadata: {
    includeProject: boolean;
    includeTags: boolean;
    includeTimestamps: boolean;
  };
}

export class PresetManager {
  private static readonly STORAGE_KEY = 'grymsynth_export_presets';
  private presets: Map<string, ExportPreset>;

  constructor() {
    this.presets = new Map();
    this.initializeDefaultPresets();
    this.loadUserPresets();
  }

  private initializeDefaultPresets(): void {
    const defaultPresets: ExportPreset[] = [
      {
        id: 'studio',
        name: 'Studio',
        description: 'Maximum quality for professional studio use',
        settings: {
          format: 'wav',
          sampleRate: 96000,
          bitDepth: 32,
          channels: 2,
          normalization: true,
          dithering: true,
          compression: {
            enabled: false,
            quality: 100
          },
          metadata: {
            includeProject: true,
            includeTags: true,
            includeTimestamps: true
          }
        }
      },
      {
        id: 'standard',
        name: 'Standard',
        description: 'Balanced quality for general use',
        settings: {
          format: 'wav',
          sampleRate: 48000,
          bitDepth: 24,
          channels: 2,
          normalization: true,
          dithering: true,
          compression: {
            enabled: false,
            quality: 100
          },
          metadata: {
            includeProject: true,
            includeTags: true,
            includeTimestamps: true
          }
        }
      },
      {
        id: 'web',
        name: 'Web',
        description: 'Optimized for web streaming',
        settings: {
          format: 'mp3',
          sampleRate: 44100,
          channels: 2,
          normalization: true,
          dithering: true,
          compression: {
            enabled: true,
            quality: 85
          },
          metadata: {
            includeProject: false,
            includeTags: true,
            includeTimestamps: false
          }
        }
      },
      {
        id: 'archive',
        name: 'Archive',
        description: 'Lossless compression for archival',
        settings: {
          format: 'flac',
          sampleRate: 96000,
          bitDepth: 24,
          channels: 2,
          normalization: false,
          dithering: false,
          compression: {
            enabled: true,
            quality: 100
          },
          metadata: {
            includeProject: true,
            includeTags: true,
            includeTimestamps: true
          }
        }
      }
    ];

    defaultPresets.forEach(preset => {
      this.presets.set(preset.id, preset);
    });
  }

  private loadUserPresets(): void {
    try {
      const stored = localStorage.getItem(PresetManager.STORAGE_KEY);
      if (stored) {
        const userPresets = JSON.parse(stored) as ExportPreset[];
        userPresets.forEach(preset => {
          if (this.validatePreset(preset)) {
            this.presets.set(preset.id, preset);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load user presets:', error);
    }
  }

  public saveUserPreset(preset: ExportPreset): void {
    if (!this.validatePreset(preset)) {
      throw new Error('Invalid preset configuration');
    }

    // Ensure we don't overwrite built-in presets
    if (['studio', 'standard', 'web', 'archive'].includes(preset.id)) {
      throw new Error('Cannot overwrite built-in presets');
    }

    this.presets.set(preset.id, preset);
    this.savePresets();
  }

  private savePresets(): void {
    try {
      const userPresets = Array.from(this.presets.values())
        .filter(preset => !['studio', 'standard', 'web', 'archive'].includes(preset.id));
      localStorage.setItem(PresetManager.STORAGE_KEY, JSON.stringify(userPresets));
    } catch (error) {
      console.error('Failed to save presets:', error);
      throw new Error('Failed to save preset');
    }
  }

  public deleteUserPreset(id: string): void {
    if (['studio', 'standard', 'web', 'archive'].includes(id)) {
      throw new Error('Cannot delete built-in presets');
    }

    if (this.presets.delete(id)) {
      this.savePresets();
    }
  }

  public getPreset(id: string): ExportPreset | undefined {
    return this.presets.get(id);
  }

  public getAllPresets(): ExportPreset[] {
    return Array.from(this.presets.values());
  }

  private validatePreset(preset: ExportPreset): boolean {
    try {
      // Basic structure validation
      if (!preset.id || !preset.name || !preset.settings) {
        return false;
      }

      const settings = preset.settings;

      // Format validation
      if (!['wav', 'mp3', 'ogg', 'flac'].includes(settings.format)) {
        return false;
      }

      // Sample rate validation
      if (![44100, 48000, 96000].includes(settings.sampleRate)) {
        return false;
      }

      // Bit depth validation (optional for compressed formats)
      if (settings.bitDepth && ![16, 24, 32].includes(settings.bitDepth)) {
        return false;
      }

      // Channels validation
      if (![1, 2].includes(settings.channels)) {
        return false;
      }

      // Compression validation
      if (settings.compression) {
        if (typeof settings.compression.enabled !== 'boolean') {
          return false;
        }
        if (settings.compression.quality < 0 || settings.compression.quality > 100) {
          return false;
        }
      }

      // Metadata validation
      const metadata = settings.metadata;
      if (typeof metadata.includeProject !== 'boolean' ||
          typeof metadata.includeTags !== 'boolean' ||
          typeof metadata.includeTimestamps !== 'boolean') {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
