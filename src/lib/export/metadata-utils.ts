import { AudioMetadata } from './audio-export';

export interface MetadataValidationResult {
  isValid: boolean;
  errors: string[];
}

export class MetadataUtils {
  private static readonly YEAR_PATTERN = /^\d{4}$/;
  private static readonly BPM_RANGE = { min: 20, max: 400 };

  private static readonly GENRE_TEMPLATES = new Set([
    'Electronic', 'Rock', 'Jazz', 'Classical', 'Hip Hop',
    'Pop', 'Ambient', 'Folk', 'Metal', 'Blues'
  ]);

  /**
   * Validates metadata fields according to common standards
   */
  public static validateMetadata(metadata: AudioMetadata): MetadataValidationResult {
    const errors: string[] = [];

    // Check year format if provided
    if (metadata.year && !this.YEAR_PATTERN.test(metadata.year)) {
      errors.push('Year must be in YYYY format');
    }

    // Validate BPM range if provided
    if (metadata.bpm !== undefined) {
      if (metadata.bpm < this.BPM_RANGE.min || metadata.bpm > this.BPM_RANGE.max) {
        errors.push(`BPM must be between ${this.BPM_RANGE.min} and ${this.BPM_RANGE.max}`);
      }
    }

    // Check custom tags format
    if (metadata.customTags) {
      for (const [key, value] of Object.entries(metadata.customTags)) {
        if (key.length > 4) {
          errors.push(`Custom tag key '${key}' exceeds maximum length of 4 characters`);
        }
        if (!value || typeof value !== 'string') {
          errors.push(`Custom tag '${key}' must have a non-empty string value`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extracts metadata from filename using common patterns
   */
  public static extractFromFilename(filename: string): Partial<AudioMetadata> {
    const metadata: Partial<AudioMetadata> = {};

    // Remove extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

    // Pattern: Artist - Title
    const artistTitleMatch = nameWithoutExt.match(/^(.+?)\s*-\s*(.+?)$/);
    if (artistTitleMatch) {
      metadata.artist = artistTitleMatch[1].trim();
      metadata.title = artistTitleMatch[2].trim();
    } else {
      metadata.title = nameWithoutExt.trim();
    }

    // Pattern: [BPM]
    const bpmMatch = nameWithoutExt.match(/\[(\d+)\s*(?:bpm)?\]/i);
    if (bpmMatch) {
      const bpm = parseInt(bpmMatch[1], 10);
      if (bpm >= this.BPM_RANGE.min && bpm <= this.BPM_RANGE.max) {
        metadata.bpm = bpm;
      }
    }

    // Pattern: (Genre)
    const genreMatch = nameWithoutExt.match(/\(([^)]+)\)/i);
    if (genreMatch) {
      metadata.genre = genreMatch[1].trim();
    }

    // Pattern: {Key}
    const keyMatch = nameWithoutExt.match(/{([^}]+)}/i);
    if (keyMatch) {
      metadata.key = keyMatch[1].trim();
    }

    return metadata;
  }

  /**
   * Creates metadata from template for common use cases
   */
  public static createTemplate(type: 'empty' | 'minimal' | 'full'): AudioMetadata {
    const now = new Date();
    const year = now.getFullYear().toString();

    switch (type) {
      case 'empty':
        return {};

      case 'minimal':
        return {
          title: '',
          artist: '',
          year
        };

      case 'full':
        return {
          title: '',
          artist: '',
          album: '',
          year,
          genre: '',
          comments: '',
          bpm: undefined,
          key: '',
          customTags: {}
        };

      default:
        throw new Error(`Unknown template type: ${type}`);
    }
  }

  /**
   * Creates genre-specific metadata template
   */
  public static createGenreTemplate(genre: string): AudioMetadata {
    if (!this.GENRE_TEMPLATES.has(genre)) {
      throw new Error(`Unsupported genre template: ${genre}`);
    }

    const base = this.createTemplate('minimal');
    base.genre = genre;

    // Add genre-specific defaults
    switch (genre) {
      case 'Electronic':
        base.customTags = {
          'BPM': '128',
          'KEY': 'Fm'
        };
        break;

      case 'Classical':
        base.customTags = {
          'OPUS': '',
          'MOVE': '1'
        };
        break;

      case 'Jazz':
        base.customTags = {
          'BAND': '',
          'LIVE': 'N'
        };
        break;
    }

    return base;
  }

  /**
   * Merges metadata objects, with newer values taking precedence
   */
  public static mergeMetadata(
    base: Partial<AudioMetadata>,
    overlay: Partial<AudioMetadata>
  ): AudioMetadata {
    return {
      ...base,
      ...overlay,
      customTags: {
        ...(base.customTags || {}),
        ...(overlay.customTags || {})
      }
    };
  }

  /**
   * Sanitizes metadata fields by trimming strings and removing invalid values
   */
  public static sanitizeMetadata(metadata: AudioMetadata): AudioMetadata {
    const result: AudioMetadata = {};

    // Helper to process string fields
    const sanitizeString = (value?: string) =>
      value?.trim() || undefined;

    result.title = sanitizeString(metadata.title);
    result.artist = sanitizeString(metadata.artist);
    result.album = sanitizeString(metadata.album);
    result.year = metadata.year?.match(this.YEAR_PATTERN)?.[0];
    result.genre = sanitizeString(metadata.genre);
    result.comments = sanitizeString(metadata.comments);
    result.key = sanitizeString(metadata.key);

    // Validate BPM
    if (metadata.bpm !== undefined) {
      if (metadata.bpm >= this.BPM_RANGE.min && metadata.bpm <= this.BPM_RANGE.max) {
        result.bpm = metadata.bpm;
      }
    }

    // Sanitize custom tags
    if (metadata.customTags) {
      result.customTags = {};
      for (const [key, value] of Object.entries(metadata.customTags)) {
        if (key.length <= 4 && value) {
          result.customTags[key] = value.trim();
        }
      }
    }

    return result;
  }
}
