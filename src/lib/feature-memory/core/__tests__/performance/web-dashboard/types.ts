import { PerformanceReport, ThresholdViolation } from "../types";

export interface WebSocketMessage {
  type:
    | "init"
    | "startMonitoring"
    | "stopMonitoring"
    | "sessionStarted"
    | "sessionEnded"
    | "realtimeUpdate"
    | "historicalUpdate"
    | "alert";
  sessionId?: string;
  data?: any;
  report?: PerformanceReport;
}

export interface DashboardData {
  realtime: {
    cpu: TimeSeriesPoint[];
    memory: TimeSeriesPoint[];
    load: TimeSeriesPoint[];
    violations: ThresholdViolation[];
  };
  historical: {
    daily: PerformanceReport[];
    weekly: {
      cpu: number[];
      memory: number[];
      load: number[];
      violations: number;
    };
  };
  alerts: Alert[];
}

export interface Alert {
  active: boolean;
  message?: string;
  level: "info" | "warning" | "error";
  timestamp: number;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

// Install script for required dependencies
export const installCommand = `
npm install express ws @types/express @types/ws
npm install --save-dev typescript ts-node @types/node
`;
