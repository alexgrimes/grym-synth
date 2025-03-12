import { MetadataUtils } from '../metadata-utils';
import { AudioMetadata } from '../audio-export';

describe('MetadataUtils', () => {
  describe('Metadata Validation', () => {
    it('should validate year format', () => {
      const validMetadata: AudioMetadata = {
        title: 'Test',
        year: '2025'
      };
      expect(MetadataUtils.validateMetadata(validMetadata).isValid).toBe(true);

      const invalidMetadata: AudioMetadata = {
        title: 'Test',
        year: '20250'
      };
      const result = MetadataUtils.validateMetadata(invalidMetadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Year must be in YYYY format');
    });

    it('should validate BPM range', () => {
      const validMetadata: AudioMetadata = {
        title: 'Test',
        bpm: 128
      };
      expect(MetadataUtils.validateMetadata(validMetadata).isValid).toBe(true);

      const invalidMetadata: AudioMetadata = {
        title: 'Test',
        bpm: 500
      };
      const result = MetadataUtils.validateMetadata(invalidMetadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BPM must be between 20 and 400');
    });

    it('should validate custom tags', () => {
      const validMetadata: AudioMetadata = {
        title: 'Test',
        customTags: {
          'KEY': 'Am',
          'BPM': '128'
        }
      };
      expect(MetadataUtils.validateMetadata(validMetadata).isValid).toBe(true);

      const invalidMetadata: AudioMetadata = {
        title: 'Test',
        customTags: {
          'TOOLONG': 'Value',
          'TAG': ''
        }
      };
      const result = MetadataUtils.validateMetadata(invalidMetadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Custom tag key 'TOOLONG' exceeds maximum length of 4 characters"
      );
      expect(result.errors).toContain(
        "Custom tag 'TAG' must have a non-empty string value"
      );
    });
  });

  describe('Filename Metadata Extraction', () => {
    it('should extract artist and title', () => {
      const metadata = MetadataUtils.extractFromFilename('Artist Name - Song Title.wav');
      expect(metadata.artist).toBe('Artist Name');
      expect(metadata.title).toBe('Song Title');
    });

    it('should extract BPM', () => {
      const metadata = MetadataUtils.extractFromFilename('Track [128 bpm].wav');
      expect(metadata.bpm).toBe(128);

      const invalidBpm = MetadataUtils.extractFromFilename('Track [500 bpm].wav');
      expect(invalidBpm.bpm).toBeUndefined();
    });

    it('should extract genre and key', () => {
      const metadata = MetadataUtils.extractFromFilename('Track (Electronic) {Fm}.wav');
      expect(metadata.genre).toBe('Electronic');
      expect(metadata.key).toBe('Fm');
    });

    it('should handle filenames without metadata', () => {
      const metadata = MetadataUtils.extractFromFilename('simple_filename.wav');
      expect(metadata.title).toBe('simple_filename');
      expect(metadata.artist).toBeUndefined();
      expect(metadata.bpm).toBeUndefined();
    });
  });

  describe('Template Creation', () => {
    it('should create empty template', () => {
      const template = MetadataUtils.createTemplate('empty');
      expect(Object.keys(template).length).toBe(0);
    });

    it('should create minimal template', () => {
      const template = MetadataUtils.createTemplate('minimal');
      expect(template.title).toBe('');
      expect(template.artist).toBe('');
      expect(template.year).toBe(new Date().getFullYear().toString());
    });

    it('should create full template', () => {
      const template = MetadataUtils.createTemplate('full');
      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('artist');
      expect(template).toHaveProperty('album');
      expect(template).toHaveProperty('genre');
      expect(template).toHaveProperty('customTags');
    });

    it('should create genre-specific template', () => {
      const electronic = MetadataUtils.createGenreTemplate('Electronic');
      expect(electronic.genre).toBe('Electronic');
      expect(electronic.customTags?.BPM).toBe('128');
      expect(electronic.customTags?.KEY).toBe('Fm');

      const classical = MetadataUtils.createGenreTemplate('Classical');
      expect(classical.genre).toBe('Classical');
      expect(classical.customTags?.OPUS).toBeDefined();
      expect(classical.customTags?.MOVE).toBe('1');

      expect(() => {
        MetadataUtils.createGenreTemplate('InvalidGenre');
      }).toThrow('Unsupported genre template');
    });
  });

  describe('Metadata Merging', () => {
    it('should merge metadata objects', () => {
      const base: Partial<AudioMetadata> = {
        title: 'Original Title',
        artist: 'Original Artist',
        customTags: {
          'TAG1': 'Value1'
        }
      };

      const overlay: Partial<AudioMetadata> = {
        title: 'New Title',
        genre: 'Electronic',
        customTags: {
          'TAG2': 'Value2'
        }
      };

      const merged = MetadataUtils.mergeMetadata(base, overlay);
      expect(merged.title).toBe('New Title');
      expect(merged.artist).toBe('Original Artist');
      expect(merged.genre).toBe('Electronic');
      expect(merged.customTags).toEqual({
        'TAG1': 'Value1',
        'TAG2': 'Value2'
      });
    });
  });

  describe('Metadata Sanitization', () => {
    it('should trim string fields', () => {
      const metadata: AudioMetadata = {
        title: '  Title with spaces  ',
        artist: ' Artist ',
        genre: 'Genre  '
      };

      const sanitized = MetadataUtils.sanitizeMetadata(metadata);
      expect(sanitized.title).toBe('Title with spaces');
      expect(sanitized.artist).toBe('Artist');
      expect(sanitized.genre).toBe('Genre');
    });

    it('should remove invalid values', () => {
      const metadata: AudioMetadata = {
        title: '',
        year: '20250',
        bpm: 500,
        customTags: {
          'TOOLONG': 'Value',
          'TAG': ''
        }
      };

      const sanitized = MetadataUtils.sanitizeMetadata(metadata);
      expect(sanitized.title).toBeUndefined();
      expect(sanitized.year).toBeUndefined();
      expect(sanitized.bpm).toBeUndefined();
      expect(Object.keys(sanitized.customTags || {})).toHaveLength(0);
    });

    it('should handle undefined fields', () => {
      const metadata: AudioMetadata = {
        title: undefined,
        artist: null as any,
        customTags: undefined
      };

      const sanitized = MetadataUtils.sanitizeMetadata(metadata);
      expect(sanitized.title).toBeUndefined();
      expect(sanitized.artist).toBeUndefined();
      expect(sanitized.customTags).toBeUndefined();
    });
  });
});
