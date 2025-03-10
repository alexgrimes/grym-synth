export interface AudioBuffer {
  sampleRate: number;
  duration: number;
  numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
}

export interface ProcessingOptions {
  model?: string;
  [key: string]: any;
}

export interface ModelConfig {
  name: string;
  path: string;
  parameters?: Record<string, any>;
}

export interface AudioPattern {
  id: string;
  startTime: number;
  endTime: number;
  frequencyRange: {
    low: number;
    high: number;
  };
  confidence: number;
  type: string;
  features: Float32Array;
}

export interface PatternMetadata {
  sourceId: string;
  createdAt: Date;
  lastModified: Date;
  [key: string]: any;
}

export interface PatternQuery {
  type?: string;
  timeRange?: {
    min: number;
    max: number;
  };
  frequencyRange?: {
    min: number;
    max: number;
  };
  confidenceThreshold?: number;
  sourceId?: string;
  sortBy?: "startTime" | "endTime" | "confidence";
  sortDirection?: "asc" | "desc";
  limit?: number;
}
