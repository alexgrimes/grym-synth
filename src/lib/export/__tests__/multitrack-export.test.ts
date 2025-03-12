import { promises as fs } from 'fs';
import { join } from 'path';
import { MultitrackExporter, MultitrackExportOptions } from '../multitrack-export';
import { AudioMetadata } from '../audio-export';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn()
  }
}));

describe('MultitrackExporter', () => {
  const createTestTrack = (name: string, length = 44100) => {
    const audioData = [
      new Float32Array(length),
      new Float32Array(length)
    ];

    // Fill with sine wave
    for (let i = 0; i < length; i++) {
      const value = Math.sin(2 * Math.PI * 440 * i / 44100);
      audioData[0][i] = value;
      audioData[1][i] = value * 0.8;
    }

    return {
      name,
      audioData,
      metadata: {
        title: name,
        artist: 'Test Artist',
        album: 'Test Album'
      } as AudioMetadata
    };
  };

  const baseOptions: MultitrackExportOptions = {
    format: 'wav',
    sampleRate: 44100,
    bitDepth: 16,
    createSubfolders: true,
    includeMetadata: true,
    onProgress: jest.fn()
  };

  const basePath = '/test/export';

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initialization and Validation', () => {
    it('should create export directory structure', async () => {
      const tracks = [
        createTestTrack('Track 1'),
        createTestTrack('Track 2')
      ];

      const exporter = new MultitrackExporter(tracks, baseOptions, basePath);
      await exporter.export();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('multitrack-export'),
        expect.any(Object)
      );
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('audio'),
        expect.any(Object)
      );
    });

    it('should throw error for empty tracks array', () => {
      expect(() => {
        new MultitrackExporter([], baseOptions, basePath);
      }).toThrow('No tracks provided for export');
    });

    it('should throw error for invalid track data', () => {
      const invalidTrack = {
        name: 'Invalid Track',
        audioData: [new Float32Array(1000)] // Missing second channel
      };

      expect(() => {
        new MultitrackExporter([invalidTrack], baseOptions, basePath);
      }).toThrow('Invalid audio data for track');
    });
  });

  describe('Track Export', () => {
    it('should export all tracks', async () => {
      const tracks = [
        createTestTrack('Track 1'),
        createTestTrack('Track 2'),
        createTestTrack('Track 3')
      ];

      const exporter = new MultitrackExporter(tracks, baseOptions, basePath);
      await exporter.export();

      // Verify each track was written
      expect(fs.writeFile).toHaveBeenCalledTimes(tracks.length);
      tracks.forEach(track => {
        expect(fs.writeFile).toHaveBeenCalledWith(
          expect.stringContaining(track.name.replace(/[<>:"/\\|?*]/g, '_')),
          expect.any(Buffer)
        );
      });
    });

    it('should sanitize track names', async () => {
      const tracks = [
        createTestTrack('Track: 1/2'),
        createTestTrack('Track * Special?')
      ];

      const exporter = new MultitrackExporter(tracks, baseOptions, basePath);
      await exporter.export();

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('Track_ 1_2'),
        expect.any(Buffer)
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('Track _ Special_'),
        expect.any(Buffer)
      );
    });

    it('should track progress correctly', async () => {
      const progressCallback = jest.fn();
      const tracks = [
        createTestTrack('Track 1'),
        createTestTrack('Track 2')
      ];

      const options = { ...baseOptions, onProgress: progressCallback };
      const exporter = new MultitrackExporter(tracks, options, basePath);
      await exporter.export();

      expect(progressCallback).toHaveBeenCalled();
      const progressCalls = progressCallback.mock.calls;

      // Verify progress increases
      const progressValues = progressCalls.map(call => call[0]);
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }
    });
  });

  describe('Reaper Project Generation', () => {
    const reaperOptions = {
      ...baseOptions,
      reaper: {
        createProject: true
      }
    };

    it('should generate Reaper project file', async () => {
      const tracks = [
        createTestTrack('Track 1'),
        createTestTrack('Track 2')
      ];

      const exporter = new MultitrackExporter(tracks, reaperOptions, basePath);
      await exporter.export();

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('project.rpp'),
        expect.stringContaining('REAPER_PROJECT')
      );

      // Verify track entries in project file
      const projectCall = (fs.writeFile as jest.Mock).mock.calls.find(
        call => call[0].endsWith('project.rpp')
      );
      const projectContent = projectCall[1];

      tracks.forEach(track => {
        expect(projectContent).toContain(`NAME "${track.name}"`);
      });
    });

    it('should use custom template if provided', async () => {
      const customTemplate = '<CUSTOM_TEMPLATE>\n{{TRACKS}}\n</CUSTOM_TEMPLATE>';
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(customTemplate));

      const tracks = [createTestTrack('Track 1')];
      const options = {
        ...reaperOptions,
        reaper: {
          createProject: true,
          templatePath: 'custom-template.rpp'
        }
      };

      const exporter = new MultitrackExporter(tracks, options, basePath);
      await exporter.export();

      expect(fs.readFile).toHaveBeenCalledWith('custom-template.rpp');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('project.rpp'),
        expect.stringContaining('CUSTOM_TEMPLATE')
      );
    });
  });

  describe('Resource Management', () => {
    it('should limit parallel exports', async () => {
      const tracks = Array.from({ length: 6 }, (_, i) =>
        createTestTrack(`Track ${i + 1}`)
      );

      const exporter = new MultitrackExporter(tracks, baseOptions, basePath);
      await exporter.export();

      // Check that writeFile was called in batches
      const writeCalls = (fs.writeFile as jest.Mock).mock.calls;
      const writeTimestamps = writeCalls.map(() => Date.now());

      // Group timestamps by batch (should see 2 batches of 4 and 2)
      const sortedTimestamps = writeTimestamps.sort();
      const batch1 = sortedTimestamps.slice(0, 4);
      const batch2 = sortedTimestamps.slice(4);

      // First batch should be close together
      expect(Math.max(...batch1) - Math.min(...batch1)).toBeLessThan(100);
      // Second batch should be after first
      expect(Math.min(...batch2)).toBeGreaterThan(Math.max(...batch1));
    });
  });
});
