// Common response types for API endpoints

// Base response interface for all API responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  requestId?: string;
  timestamp: string;
}

// Audio generation related types
export interface AudioResult {
  audioId: string;
  url: string;
  duration: number;
  format: string;
  createdAt: string;
  prompt: string;
  model: string;
  parameters: Record<string, any>;
}

export interface GenerationParams {
  model: string;
  duration?: number;
  sampleRate?: number;
  temperature?: number;
  seed?: number;
  guidanceScale?: number;
  topK?: number;
  topP?: number;
  format?: 'mp3' | 'wav' | 'ogg';
  enhanceBass?: boolean;
  noiseReduction?: boolean;
  [key: string]: any; // Allow for model-specific parameters
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  estimatedTimeRemaining?: number;
  result?: AudioResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Pattern recognition related types
export interface AnalysisParams {
  techniques: string[];
  resolution?: 'low' | 'medium' | 'high';
  focusAreas?: string[];
  [key: string]: any;
}

export interface Pattern {
  id: string;
  name: string;
  type: string;
  confidence: number;
  startTime: number;
  endTime: number;
  description?: string;
  parameters?: Record<string, any>;
}

export interface PatternResult {
  analysisId: string;
  audioId: string;
  patterns: Pattern[];
  techniques: string[];
  createdAt: string;
}

// Model management related types
export interface ModelStatus {
  id: string;
  name: string;
  version: string;
  type: 'audio-generation' | 'pattern-recognition' | 'parameter-mapping';
  installed: boolean;
  available: boolean;
  size: number;
  lastUpdated: string;
  capabilities: string[];
}

export interface DownloadStatus {
  modelId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  estimatedTimeRemaining?: number;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  type: 'audio-generation' | 'pattern-recognition' | 'parameter-mapping';
  description: string;
  size: number;
  author: string;
  license: string;
  capabilities: string[];
  parameters: {
    name: string;
    type: string;
    description: string;
    defaultValue: any;
    min?: number;
    max?: number;
    options?: string[];
  }[];
  requirements: {
    minRAM: number;
    minVRAM?: number;
    minCPU?: string;
    minGPU?: string;
  };
  lastUpdated: string;
  releaseNotes?: string;
}

// Parameter mapping related types
export interface MappingParams {
  sourceType: 'audio' | 'pattern' | 'manual';
  sourceId?: string;
  targetModel: string;
  mappingStrategy: string;
  constraints?: Record<string, any>;
}

export interface ParameterMapping {
  id: string;
  sourceType: 'audio' | 'pattern' | 'manual';
  sourceId?: string;
  targetModel: string;
  mappingStrategy: string;
  parameters: Record<string, any>;
  createdAt: string;
}
