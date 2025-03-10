export interface PerformanceMetrics {
  successRate: number;
  latency: number;
  resourceUsage: number;
}

export interface CapabilityScore {
  modelId: string;
  capabilities: Map<string, number>; // Capability -> Score (0-1)
  performanceMetrics: PerformanceMetrics;
}

export interface PerformanceRecord {
  timestamp: number;
  latency: number;
  resourceUsage: number;
  success: boolean;
}

export interface ModelCapabilityData {
  records: PerformanceRecord[];
  aggregateScore: number;
  lastUpdated: number;
}

// Parameters for capability scoring configuration
export interface ScoringConfig {
  decayFactor: number; // Factor for historical decay (e.g., 0.95)
  timeWindow: number; // Time window for historical data in ms (e.g., 7 days)
  minSamples: number; // Minimum samples required for scoring
  weightFactors: {
    successRate: number;
    latency: number;
    resourceUsage: number;
  };
}