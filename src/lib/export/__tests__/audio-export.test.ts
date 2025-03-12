import { AudioExporter, AudioExportOptions } from '../audio-export';

describe('AudioExporter', () => {
  const createTestAudio = (length: number, frequency = 440): Float32Array[] => {
    // Create a simple sine wave at A4 (440Hz)
    const channels: Float32Array[] = [
      new Float32Array(length),
      new Float32Array(length)
    ];

    for (let i = 0; i < length; i++) {
      const value = Math.sin(2 * Math.PI * frequency * i / 44100);
      channels[0][i] = value; // Left channel
      channels[1][i] = value * 0.8; // Right channel at 80% volume
    }

    return channels;
  };

  const metadata = {
    title: 'Test Audio',
    artist: 'GrymSynth',
    album: 'Test Album',
    year: '2025',
    genre: 'Electronic',
    comments: 'Test export',
    bpm: 120,
    key: 'A',
    customTags: {
      'TEST': 'Custom tag value'
    }
  };

  describe('WAV Export', () => {
    const options: AudioExportOptions = {
      format: 'wav',
      sampleRate: 44100,
      bitDepth: 16,
      metadata,
      onProgress: jest.fn()
    };

    it('should create valid WAV file with correct header', async () => {
      const exporter = new AudioExporter(options);
      const audioData = createTestAudio(44100); // 1 second of audio
      const result = await exporter.export(audioData);

      // Check RIFF header
      expect(result.toString('ascii', 0, 4)).toBe('RIFF');
      expect(result.toString('ascii', 8, 12)).toBe('WAVE');

      // Check format chunk
      expect(result.toString('ascii', 12, 16)).toBe('fmt ');
      expect(result.readInt16LE(20)).toBe(1); // PCM format
      expect(result.readInt16LE(22)).toBe(2); // 2 channels
      expect(result.readInt32LE(24)).toBe(44100); // Sample rate
      expect(result.readInt16LE(34)).toBe(16); // Bits per sample
    });

    it('should handle different bit depths', async () => {
      const bitDepths = [8, 16, 24, 32];
      const audioData = createTestAudio(22050); // 0.5 seconds of audio

      for (const bitDepth of bitDepths) {
        const exportOptions = { ...options, bitDepth };
        const exporter = new AudioExporter(exportOptions);
        const result = await exporter.export(audioData);

        expect(result.readInt16LE(34)).toBe(bitDepth); // Verify bit depth in header
      }
    });

    it('should include metadata in INFO chunk', async () => {
      const exporter = new AudioExporter(options);
      const audioData = createTestAudio(22050);
      const result = await exporter.export(audioData);

      // Find LIST chunk
      let offset = 12;
      while (offset < result.length - 4) {
        const chunkId = result.toString('ascii', offset, offset + 4);
        if (chunkId === 'LIST') {
          const infoData = result.toString('ascii', offset + 8, offset + 12);
          expect(infoData).toBe('INFO');

          // Check if title metadata exists
          const titleData = result.toString('ascii', offset + 12, offset + 16);
          expect(titleData).toBe('INAM');
          break;
        }
        offset += 4;
      }
    });

    it('should report progress correctly', async () => {
      const progressCallback = jest.fn();
      const exportOptions = { ...options, onProgress: progressCallback };
      const exporter = new AudioExporter(exportOptions);
      const audioData = createTestAudio(44100);

      await exporter.export(audioData);

      expect(progressCallback).toHaveBeenCalledWith(0, 'Initializing WAV export');
      expect(progressCallback).toHaveBeenCalledWith(100, 'WAV export complete');

      // Verify some progress updates were called
      const progressCalls = progressCallback.mock.calls.filter(
        call => call[1] === 'Converting audio data'
      );
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('MP3 Export', () => {
    const options: AudioExportOptions = {
      format: 'mp3',
      sampleRate: 44100,
      bitRate: 192,
      metadata,
      onProgress: jest.fn()
    };

    it('should create valid MP3 file with ID3v2 tags', async () => {
      const exporter = new AudioExporter(options);
      const audioData = createTestAudio(44100); // 1 second of audio
      const result = await exporter.export(audioData);

      // Check for ID3v2 header
      expect(result.toString('ascii', 0, 3)).toBe('ID3');

      // Check version (2.3.0)
      expect(result.readUInt8(3)).toBe(3);
      expect(result.readUInt8(4)).toBe(0);
    });

    it('should report progress during MP3 conversion', async () => {
      const progressCallback = jest.fn();
      const exportOptions = { ...options, onProgress: progressCallback };
      const exporter = new AudioExporter(exportOptions);
      const audioData = createTestAudio(44100);

      await exporter.export(audioData);

      expect(progressCallback).toHaveBeenCalledWith(0, 'Initializing MP3 export');
      expect(progressCallback).toHaveBeenCalledWith(100, 'MP3 export complete');

      // Verify conversion progress updates
      const conversionCalls = progressCallback.mock.calls.filter(
        call => call[1] === 'Converting to MP3'
      );
      expect(conversionCalls.length).toBeGreaterThan(0);
    });

    it('should handle different bit rates', async () => {
      const bitRates = [128, 192, 256, 320];
      const audioData = createTestAudio(22050); // 0.5 seconds of audio

      for (const bitRate of bitRates) {
        const exportOptions = { ...options, bitRate };
        const exporter = new AudioExporter(exportOptions);
        await expect(exporter.export(audioData)).resolves.toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid formats', () => {
      expect(() => {
        new AudioExporter({ format: 'invalid' as any });
      }).toThrow('Unsupported format');
    });

    it('should reject invalid bit depths for WAV', () => {
      expect(() => {
        new AudioExporter({ format: 'wav', bitDepth: 12 });
      }).toThrow('Invalid bit depth');
    });

    it('should require stereo audio data', async () => {
      const exporter = new AudioExporter({ format: 'wav' });
      const monoAudio = [new Float32Array(1000)];

      await expect(exporter.export(monoAudio)).rejects.toThrow('requires stereo audio data');
    });

    it('should handle empty metadata gracefully', async () => {
      const exporter = new AudioExporter({ format: 'wav' });
      const audioData = createTestAudio(22050);
      const result = await exporter.export(audioData);

      expect(result.toString('ascii', 0, 4)).toBe('RIFF');
      expect(result.toString('ascii', 8, 12)).toBe('WAVE');
    });
  });
});
