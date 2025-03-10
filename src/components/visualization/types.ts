export interface SpectralRegion {
  startTime: number;
  endTime: number;
  lowFreq: number;
  highFreq: number;
  confidence?: number;
  patternId?: string;
  label?: string;
}

export interface AudioMetadata {
  id: string;
  name: string;
  duration: number;
  format: string;
  sampleRate: number;
  channels: number;
  createdAt: string;
}

export interface SpectrogramData {
  timePoints: number[];
  frequencies: number[];
  magnitudes: number[][];
  patterns?: SpectralRegion[];
  duration: number;
  sampleRate: number;
}

export interface WaveformRegion {
  start: number;
  end: number;
}

export interface AudioWaveformProps {
  audioUrl: string;
  height?: number;
  width?: number;
  isPlaying?: boolean;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  onWaveformClick?: (time: number) => void;
  showProgress?: boolean;
  showControls?: boolean;
}

export interface PatternVisualizationProps {
  patterns: SpectralRegion[];
  width?: number;
  height?: number;
  selectedPatternId?: string;
  onPatternSelect?: (pattern: SpectralRegion) => void;
  showLabels?: boolean;
  showConfidence?: boolean;
}

export interface SpectrogramVisualizationProps {
  audioId: string;
  width?: number;
  height?: number;
  minFreq?: number;
  maxFreq?: number;
  colorMap?: "viridis" | "inferno" | "magma" | "plasma" | "grayscale";
  showPatterns?: boolean;
  onRegionSelect?: (region: SpectralRegion) => void;
  selectedRegion?: SpectralRegion | null;
  zoomLevel?: number;
  timeRange?: [number, number];
  syncWithWaveform?: boolean;
}

export interface ColorMapRange {
  min: number;
  max: number;
  color: string;
}

export interface VisualizationOptions {
  showGrid?: boolean;
  showAxis?: boolean;
  showLabels?: boolean;
  showTimeMarkers?: boolean;
  showFrequencyMarkers?: boolean;
  theme?: "light" | "dark";
  colorMap?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  markerColor?: string;
  gridColor?: string;
  labelColor?: string;
}
