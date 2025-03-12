import { Buffer } from 'buffer';
import Shine from 'shine-mp3';

interface Mp3EncoderConfig {
  bitRate?: number;  // in kbps, default 192
  mode?: 'CBR' | 'VBR'; // default CBR
  quality?: number; // 0-6 (0=best)
}

export interface AudioExportOptions {
  format: 'wav' | 'mp3' | 'flac';
  sampleRate?: number;
  bitDepth?: number;
  bitRate?: number;
  metadata?: AudioMetadata;
  onProgress?: (progress: number, stage: string) => void;
}

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  comments?: string;
  bpm?: number;
  key?: string;
  customTags?: Record<string, string>;
}

interface WavHeader {
  chunkId: string;
  chunkSize: number;
  format: string;
  subchunk1Id: string;
  subchunk1Size: number;
  audioFormat: number;
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  subchunk2Id: string;
  subchunk2Size: number;
}

export class AudioExporter {
  private static readonly SUPPORTED_FORMATS = ['wav', 'mp3', 'flac'];
  private static readonly DEFAULT_SAMPLE_RATE = 44100;
  private static readonly DEFAULT_BIT_DEPTH = 16;
  private static readonly DEFAULT_BIT_RATE = 192;
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks for processing

  constructor(private options: AudioExportOptions) {
    this.validateOptions();
  }

  private validateOptions(): void {
    if (!this.options.format || !AudioExporter.SUPPORTED_FORMATS.includes(this.options.format)) {
      throw new Error(`Unsupported format: ${this.options.format}`);
    }

    this.options.sampleRate = this.options.sampleRate || AudioExporter.DEFAULT_SAMPLE_RATE;
    this.options.bitDepth = this.options.bitDepth || AudioExporter.DEFAULT_BIT_DEPTH;
    this.options.bitRate = this.options.bitRate || AudioExporter.DEFAULT_BIT_RATE;

    if (this.options.format === 'wav' && ![8, 16, 24, 32].includes(this.options.bitDepth)) {
      throw new Error(`Invalid bit depth: ${this.options.bitDepth}`);
    }
  }

  private updateProgress(progress: number, stage: string): void {
    if (this.options.onProgress) {
      this.options.onProgress(progress, stage);
    }
  }

  private async processInChunks<T>(
    data: T[],
    processor: (chunk: T[]) => Promise<void>,
    stage: string
  ): Promise<void> {
    const totalChunks = Math.ceil(data.length / AudioExporter.CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * AudioExporter.CHUNK_SIZE;
      const end = Math.min(start + AudioExporter.CHUNK_SIZE, data.length);
      const chunk = data.slice(start, end);

      await processor(chunk);

      this.updateProgress((i + 1) / totalChunks * 100, stage);
    }
  }

  private createWavHeader(dataSize: number): Buffer {
    const header: WavHeader = {
      chunkId: 'RIFF',
      chunkSize: 36 + dataSize,
      format: 'WAVE',
      subchunk1Id: 'fmt ',
      subchunk1Size: 16,
      audioFormat: 1, // PCM
      numChannels: 2, // Stereo
      sampleRate: this.options.sampleRate!,
      byteRate: this.options.sampleRate! * 2 * (this.options.bitDepth! / 8),
      blockAlign: 2 * (this.options.bitDepth! / 8),
      bitsPerSample: this.options.bitDepth!,
      subchunk2Id: 'data',
      subchunk2Size: dataSize
    };

    const buffer = Buffer.alloc(44); // WAV header is always 44 bytes

    buffer.write(header.chunkId, 0);
    buffer.writeInt32LE(header.chunkSize, 4);
    buffer.write(header.format, 8);
    buffer.write(header.subchunk1Id, 12);
    buffer.writeInt32LE(header.subchunk1Size, 16);
    buffer.writeInt16LE(header.audioFormat, 20);
    buffer.writeInt16LE(header.numChannels, 22);
    buffer.writeInt32LE(header.sampleRate, 24);
    buffer.writeInt32LE(header.byteRate, 28);
    buffer.writeInt16LE(header.blockAlign, 32);
    buffer.writeInt16LE(header.bitsPerSample, 34);
    buffer.write(header.subchunk2Id, 36);
    buffer.writeInt32LE(header.subchunk2Size, 40);

    return buffer;
  }

  private embedWavMetadata(buffer: Buffer): Buffer {
    if (!this.options.metadata) {
      return buffer;
    }

    let infoChunk = Buffer.from('LIST');
    let infoData = Buffer.from('INFO');

    const addMetadataField = (id: string, value?: string) => {
      if (value) {
        const fieldData = Buffer.from(value);
        const paddedLength = Math.ceil(fieldData.length / 2) * 2;
        const fieldChunk = Buffer.alloc(paddedLength + 8);
        fieldChunk.write(id, 0);
        fieldChunk.writeInt32LE(paddedLength, 4);
        fieldData.copy(fieldChunk, 8);
        infoData = Buffer.concat([infoData, fieldChunk]);
      }
    };

    addMetadataField('INAM', this.options.metadata.title);
    addMetadataField('IART', this.options.metadata.artist);
    addMetadataField('IPRD', this.options.metadata.album);
    addMetadataField('ICRD', this.options.metadata.year);
    addMetadataField('IGNR', this.options.metadata.genre);
    addMetadataField('ICMT', this.options.metadata.comments);

    if (this.options.metadata.customTags) {
      for (const [key, value] of Object.entries(this.options.metadata.customTags)) {
        addMetadataField(key.substring(0, 4).toUpperCase(), value);
      }
    }

    const infoSize = Buffer.alloc(4);
    infoSize.writeInt32LE(infoData.length - 4);
    infoChunk = Buffer.concat([infoChunk, infoSize, infoData]);

    const newSize = buffer.readInt32LE(4) + infoChunk.length;
    buffer.writeInt32LE(newSize, 4);

    return Buffer.concat([
      buffer.slice(0, 44),
      infoChunk,
      buffer.slice(44)
    ]);
  }

  private async exportToMp3(audioData: Float32Array[]): Promise<Buffer> {
    this.updateProgress(0, 'Initializing MP3 export');

    if (audioData.length !== 2) {
      throw new Error('MP3 export requires stereo audio data (2 channels)');
    }

    const shine = new Shine({
      sampleRate: this.options.sampleRate!,
      channels: 2,
      bitrate: this.options.bitRate
    });

    this.updateProgress(10, 'Converting to MP3');

    const chunks: Buffer[] = [];
    const samplesPerChunk = 1152; // MPEG 1 Layer 3 samples per frame
    const totalChunks = Math.ceil(audioData[0].length / samplesPerChunk);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * samplesPerChunk;
      const end = Math.min(start + samplesPerChunk, audioData[0].length);
      const left = audioData[0].slice(start, end);
      const right = audioData[1].slice(start, end);

      if (left.length < samplesPerChunk) {
        // Pad the last chunk if needed
        const padding = new Float32Array(samplesPerChunk - left.length);
        left.set(padding, left.length);
        right.set(padding, right.length);
      }

      const frame = shine.encode([left, right]);
      if (frame) {
        chunks.push(Buffer.from(frame));
      }

      this.updateProgress(10 + (i / totalChunks * 80), 'Converting to MP3');
    }

    const finalFrame = shine.flush();
    if (finalFrame) {
      chunks.push(Buffer.from(finalFrame));
    }

    this.updateProgress(90, 'Finalizing MP3');

    // Add ID3v2 metadata if present
    if (this.options.metadata) {
      const id3 = this.createId3v2Metadata();
      chunks.unshift(id3);
    }

    this.updateProgress(100, 'MP3 export complete');
    return Buffer.concat(chunks);
  }

  private createId3v2Metadata(): Buffer {
    if (!this.options.metadata) return Buffer.alloc(0);

    const frames: Buffer[] = [];
    const addTextFrame = (id: string, text?: string) => {
      if (text) {
        const frame = Buffer.alloc(10 + text.length + 1);
        frame.write(id, 0); // Frame ID
        frame.writeUInt32BE(text.length + 1, 4); // Size (including encoding byte)
        frame.writeUInt8(3, 10); // UTF-8 encoding
        frame.write(text, 11); // Text
        frames.push(frame);
      }
    };

    addTextFrame('TIT2', this.options.metadata.title);
    addTextFrame('TPE1', this.options.metadata.artist);
    addTextFrame('TALB', this.options.metadata.album);
    addTextFrame('TYER', this.options.metadata.year);
    addTextFrame('TCON', this.options.metadata.genre);
    addTextFrame('COMM', this.options.metadata.comments);

    if (this.options.metadata.customTags) {
      for (const [key, value] of Object.entries(this.options.metadata.customTags)) {
        addTextFrame('TXXX', `${key}\0${value}`);
      }
    }

    const totalFrameSize = frames.reduce((size, frame) => size + frame.length, 0);
    const header = Buffer.alloc(10);
    header.write('ID3', 0); // ID3v2 identifier
    header.writeUInt8(3, 3); // Version 2.3.0
    header.writeUInt8(0, 4); // No flags
    header.writeUInt32BE(totalFrameSize, 6); // Size (synchsafe integer)

    return Buffer.concat([header, ...frames]);
  }

  public async exportToWav(audioData: Float32Array[]): Promise<Buffer> {
    this.updateProgress(0, 'Initializing WAV export');

    if (audioData.length !== 2) {
      throw new Error('WAV export requires stereo audio data (2 channels)');
    }

    const numSamples = audioData[0].length;
    const bytesPerSample = this.options.bitDepth! / 8;
    const dataSize = numSamples * 2 * bytesPerSample;
    let outputBuffer = this.createWavHeader(dataSize);
    const audioBuffer = Buffer.alloc(dataSize);

    let offset = 0;
    await this.processInChunks(
      Array.from({ length: numSamples }, (_, i) => i),
      async (sampleIndices) => {
        for (const i of sampleIndices) {
          for (let channel = 0; channel < 2; channel++) {
            const sample = Math.max(-1, Math.min(1, audioData[channel][i]));
            const value = Math.round(sample * ((1 << (this.options.bitDepth! - 1)) - 1));

            switch (this.options.bitDepth) {
              case 8:
                audioBuffer.writeInt8(value + 128, offset);
                offset += 1;
                break;
              case 16:
                audioBuffer.writeInt16LE(value, offset);
                offset += 2;
                break;
              case 24:
                audioBuffer.writeIntLE(value, offset, 3);
                offset += 3;
                break;
              case 32:
                audioBuffer.writeInt32LE(value, offset);
                offset += 4;
                break;
            }
          }
        }
      },
      'Converting audio data'
    );

    outputBuffer = Buffer.concat([outputBuffer, audioBuffer]);
    this.updateProgress(90, 'Adding metadata');
    outputBuffer = this.embedWavMetadata(outputBuffer);

    this.updateProgress(100, 'WAV export complete');
    return outputBuffer;
  }

  public async export(audioData: Float32Array[]): Promise<Buffer> {
    switch (this.options.format) {
      case 'wav':
        return this.exportToWav(audioData);
      case 'mp3':
        return this.exportToMp3(audioData);
      case 'flac':
        throw new Error('FLAC export not yet implemented');
      default:
        throw new Error(`Unsupported format: ${this.options.format}`);
    }
  }
}
