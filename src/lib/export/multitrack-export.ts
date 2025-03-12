import { Buffer } from 'buffer';
import { join } from 'path';
import { promises as fs } from 'fs';
import { AudioExporter, AudioExportOptions, AudioMetadata } from './audio-export';

export interface MultitrackExportOptions extends AudioExportOptions {
  folderName?: string;
  createSubfolders?: boolean;
  includeMetadata?: boolean;
  reaper?: {
    createProject?: boolean;
    templatePath?: string;
  };
}

interface TrackData {
  name: string;
  audioData: Float32Array[];
  metadata?: AudioMetadata;
}

export class MultitrackExporter {
  private static readonly DEFAULT_FOLDER_NAME = 'multitrack-export';
  private static readonly AUDIO_SUBFOLDER = 'audio';
  private static readonly MAX_PARALLEL_EXPORTS = 4;
  private exportPath: string;

  constructor(
    private tracks: TrackData[],
    private options: MultitrackExportOptions,
    basePath: string
  ) {
    this.validateOptions();
    this.exportPath = join(
      basePath,
      options.folderName || MultitrackExporter.DEFAULT_FOLDER_NAME
    );
  }

  private validateOptions(): void {
    if (!this.tracks || this.tracks.length === 0) {
      throw new Error('No tracks provided for export');
    }

    if (!this.options.format) {
      throw new Error('Export format must be specified');
    }

    // Ensure all tracks have valid names and audio data
    this.tracks.forEach((track, index) => {
      if (!track.name) {
        track.name = `Track ${index + 1}`;
      }
      if (!track.audioData || track.audioData.length !== 2) {
        throw new Error(`Invalid audio data for track: ${track.name}`);
      }
    });
  }

  private updateProgress(trackIndex: number, progress: number, stage: string): void {
    if (this.options.onProgress) {
      const overallProgress = (trackIndex * 100 + progress) / this.tracks.length;
      this.options.onProgress(overallProgress, `${stage} - ${this.tracks[trackIndex].name}`);
    }
  }

  private async createExportDirectory(): Promise<void> {
    await fs.mkdir(this.exportPath, { recursive: true });

    if (this.options.createSubfolders) {
      await fs.mkdir(join(this.exportPath, MultitrackExporter.AUDIO_SUBFOLDER), {
        recursive: true,
      });
    }
  }

  private getTrackExportPath(trackIndex: number): string {
    const audioFolder = this.options.createSubfolders
      ? join(this.exportPath, MultitrackExporter.AUDIO_SUBFOLDER)
      : this.exportPath;

    const track = this.tracks[trackIndex];
    const sanitizedName = track.name.replace(/[<>:"/\\|?*]/g, '_');

    return join(audioFolder, `${sanitizedName}.${this.options.format}`);
  }

  private async exportTrack(trackIndex: number): Promise<void> {
    const track = this.tracks[trackIndex];
    const exportPath = this.getTrackExportPath(trackIndex);

    const exportOptions: AudioExportOptions = {
      ...this.options,
      metadata: this.options.includeMetadata ? track.metadata : undefined,
      onProgress: (progress, stage) => this.updateProgress(trackIndex, progress, stage)
    };

    const exporter = new AudioExporter(exportOptions);
    const audioBuffer = await exporter.export(track.audioData);
    await fs.writeFile(exportPath, audioBuffer);
  }

  private async generateReaperProject(): Promise<void> {
    if (!this.options.reaper?.createProject) return;

    let template = '';

    if (this.options.reaper.templatePath) {
      template = (await fs.readFile(this.options.reaper.templatePath)).toString();
    } else {
      template = this.getDefaultReaperTemplate();
    }

    const trackEntries = this.tracks.map((track, index) => {
      const audioPath = this.getTrackExportPath(index);
      return this.createReaperTrackEntry(track.name, audioPath, index);
    });

    const projectContent = template
      .replace('{{TRACKS}}', trackEntries.join('\n'))
      .replace('{{SAMPLE_RATE}}', String(this.options.sampleRate || 44100));

    await fs.writeFile(
      join(this.exportPath, 'project.rpp'),
      projectContent
    );
  }

  private getDefaultReaperTemplate(): string {
    return `<REAPER_PROJECT 0.1 "6.0"
  SAMPLERATE {{SAMPLE_RATE}}
  TEMPO 120
{{TRACKS}}
>`;
  }

  private createReaperTrackEntry(name: string, audioPath: string, index: number): string {
    return `
  <TRACK
    NAME "${name}"
    TRACKID {${this.generateTrackId(index)}}
    POSITION 0
    PEAKCOL 16576
    BEAT -1
    AUTOMODE 0
    VOLPAN 1 0 -1 -1 1
    MUTESOLO 0 0 0
    IPHASE 0
    ISBUS 0 0
    BUSCOMP 0 0
    SHOWINMIX 1 0.6667 0.5 1 0.5 0 0 0
    SEL 0
    REC 0 0 1 0 0 0 0
    VU 2
    TRACKHEIGHT 0 0 0
    INQ 0 0 0 0.5 100 0 0 100
    NCHAN 2
    FX 1
    TRACKID {${this.generateTrackId(index)}}
    PERF 0
    MIDIOUT -1
    MAINSEND 1 0
    <ITEM
      POSITION 0
      LENGTH ${this.getTrackLength(index)}
      LOOP 0
      ALLTAKES 0
      FADEIN 1 0.01 0 1 0 0
      FADEOUT 1 0.01 0 1 0 0
      MUTE 0
      SEL 0
      IGUID {${this.generateGuid()}}
      IID 1
      NAME "${name}"
      VOLPAN 1 0 1 -1
      SOFFS 0
      PLAYRATE 1 1 0 -1 0 0.0025
      CHANMODE 0
      GUID {${this.generateGuid()}}
      <SOURCE WAVE
        FILE "${audioPath}"
      >
    >
  >`;
  }

  private generateTrackId(index: number): string {
    return `TR-${index}-${Date.now().toString(16)}`;
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  private getTrackLength(trackIndex: number): number {
    const sampleRate = this.options.sampleRate || 44100;
    return this.tracks[trackIndex].audioData[0].length / sampleRate;
  }

  public async export(): Promise<void> {
    await this.createExportDirectory();

    // Export tracks in parallel with resource constraints
    for (let i = 0; i < this.tracks.length; i += MultitrackExporter.MAX_PARALLEL_EXPORTS) {
      const batch = this.tracks
        .slice(i, i + MultitrackExporter.MAX_PARALLEL_EXPORTS)
        .map((_, index) => this.exportTrack(i + index));

      await Promise.all(batch);
    }

    if (this.options.reaper?.createProject) {
      await this.generateReaperProject();
    }
  }
}
