import { HealthMetrics } from '../types';

export interface ResourcePrediction {
  memoryUsage: number;
  cpuUtilization: number;
  timeToExhaustion: number;
}

export interface PerformancePrediction {
  expectedLoad: number;
  probabilityOfDegradation: number;
  timeToThreshold: number;
  recommendations: string[];
}

export interface EnhancedHealthMetrics extends HealthMetrics {
  prediction?: {
    resource: ResourcePrediction;
    performance: PerformancePrediction;
  };
}

export interface Pattern {
  type: 'cyclic' | 'trend' | 'spike';
  confidence: number;
  period?: number;
  magnitude?: number;
}