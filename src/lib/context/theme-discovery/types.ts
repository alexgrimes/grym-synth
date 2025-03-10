export interface ThemeNode {
  occurrences: number;
  relatedConcepts: Map<string, number>;
  firstSeen: Date;
  lastSeen: Date;
  conversations: Set<string>;
  evolution: {
    branches: Map<string, string[]>;
    depth: number;  // Theme complexity
    breadth: number;  // Related concept count
  };
}

export interface ThemeAnalysis {
  concepts: Array<{
    name: string;
    related: string[];
    depth: number;
  }>;
  patterns: {
    recurring: string[];
    emerging: string[];
  };
}

export interface EvolutionMetrics {
  depth: number;
  breadth: number;
  velocity: number;  // Rate of change
  stability: number; // Consistency over time
}

export interface Pattern {
  theme: string;
  confidence: number;
  relatedThemes: string[];
  metrics: EvolutionMetrics;
}

export interface TrendPrediction {
  theme: string;
  predictedGrowth: number;
  relatedTrends: string[];
  confidence: number;
}

export type TimeRange = {
  start: Date;
  end: Date;
};