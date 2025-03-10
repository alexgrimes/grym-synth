import express, { Request, Response } from "express";
import * as http from "http";
import { Server as WebSocketServer, WebSocket } from "ws";
import { monitor } from "../monitor-utils";
import { profiler } from "../profile-utils";
import { reportGenerator } from "../report-generator";
import { PerformanceReport } from "../types";
import {
  WebSocketMessage,
  DashboardData,
  Alert,
  TimeSeriesPoint,
} from "./types";

const MAX_DATA_POINTS = 1000;
const UPDATE_INTERVAL = 1000; // 1 second

export class PerformanceDashboard {
  private app: express.Express;
  private server: http.Server;
  private wss: WebSocketServer;
  private data: DashboardData;
  private activeSessions: Set<string>;

  constructor(port: number = 3000) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.activeSessions = new Set();

    this.data = {
      realtime: {
        cpu: [],
        memory: [],
        load: [],
        violations: [],
      },
      historical: {
        daily: [],
        weekly: {
          cpu: [],
          memory: [],
          load: [],
          violations: 0,
        },
      },
      alerts: [],
    };

    this.setupRoutes();
    this.setupWebSocket();
    this.setupMonitoring();

    this.server.listen(port, () => {
      console.log(`Performance Dashboard running on port ${port}`);
    });
  }

  private setupRoutes(): void {
    // Serve static files from dashboard directory
    this.app.use(express.static(__dirname + "/public"));

    // API endpoints
    this.app.get("/api/reports/current", (req: Request, res: Response) => {
      res.json(this.data.realtime);
    });

    this.app.get("/api/reports/daily", (req: Request, res: Response) => {
      res.json(this.data.historical.daily);
    });

    this.app.get("/api/reports/weekly", (req: Request, res: Response) => {
      res.json(this.data.historical.weekly);
    });

    this.app.get("/api/alerts", (req: Request, res: Response) => {
      res.json(this.data.alerts);
    });
  }

  private setupWebSocket(): void {
    this.wss.on("connection", (ws: WebSocket) => {
      const message: WebSocketMessage = {
        type: "init",
        data: this.data,
      };

      ws.send(JSON.stringify(message));

      ws.on("message", (messageData: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(messageData.toString());
          switch (message.type) {
            case "startMonitoring":
              if (message.sessionId) {
                this.startMonitoring(message.sessionId);
              }
              break;
            case "stopMonitoring":
              if (message.sessionId) {
                this.stopMonitoring(message.sessionId);
              }
              break;
          }
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      });
    });
  }

  private setupMonitoring(): void {
    monitor.on("monitoringStarted", ({ sessionId }) => {
      this.activeSessions.add(sessionId);
      const message: WebSocketMessage = {
        type: "sessionStarted",
        sessionId,
      };
      this.broadcastUpdate(message);
    });

    monitor.on("monitoringStopped", ({ sessionId, report }) => {
      this.activeSessions.delete(sessionId);
      this.updateHistoricalData(report);
      const message: WebSocketMessage = {
        type: "sessionEnded",
        sessionId,
        report,
      };
      this.broadcastUpdate(message);
    });

    setInterval(() => {
      this.updateRealtimeData();
    }, UPDATE_INTERVAL);
  }

  private startMonitoring(sessionId: string): void {
    if (!this.activeSessions.has(sessionId)) {
      monitor.startMonitoring(sessionId);
      profiler.startProfiling(sessionId);
    }
  }

  private stopMonitoring(sessionId: string): void {
    if (this.activeSessions.has(sessionId)) {
      monitor.stopMonitoring(sessionId);
      profiler.stopProfiling(sessionId);
    }
  }

  private updateRealtimeData(): void {
    const now = Date.now();

    for (const sessionId of this.activeSessions) {
      const session = profiler.getSession(sessionId);
      if (session) {
        const samples = session.samples;
        if (samples.length > 0) {
          const latest = samples[samples.length - 1];

          // Update time series data
          this.data.realtime.cpu.push({
            timestamp: now,
            value: latest.usage.total,
          });
          this.data.realtime.memory.push({
            timestamp: now,
            value: latest.memory.heapUsed,
          });
          this.data.realtime.load.push({
            timestamp: now,
            value: Math.max(...latest.load),
          });

          // Trim time series data
          if (this.data.realtime.cpu.length > MAX_DATA_POINTS) {
            this.data.realtime.cpu.shift();
            this.data.realtime.memory.shift();
            this.data.realtime.load.shift();
          }
        }
      }
    }

    const message: WebSocketMessage = {
      type: "realtimeUpdate",
      data: this.data.realtime,
    };
    this.broadcastUpdate(message);
  }

  private updateHistoricalData(report: PerformanceReport): void {
    // Update daily reports
    this.data.historical.daily.push(report);
    if (this.data.historical.daily.length > 24) {
      // Keep last 24 hours
      this.data.historical.daily.shift();
    }

    // Update weekly aggregates
    const weeklyData = this.data.historical.weekly;
    weeklyData.cpu.push(report.trends.cpu.mean);
    weeklyData.memory.push(report.trends.memory.mean);
    weeklyData.load.push(report.trends.load.mean);
    weeklyData.violations += report.violations.length;

    // Keep last 7 days of data
    const maxPoints = 7 * 24; // 7 days * 24 hours
    if (weeklyData.cpu.length > maxPoints) {
      weeklyData.cpu = weeklyData.cpu.slice(-maxPoints);
      weeklyData.memory = weeklyData.memory.slice(-maxPoints);
      weeklyData.load = weeklyData.load.slice(-maxPoints);
    }

    const message: WebSocketMessage = {
      type: "historicalUpdate",
      data: this.data.historical,
    };
    this.broadcastUpdate(message);
  }

  private broadcastUpdate(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  public addAlert(message: string, level: Alert["level"] = "info"): void {
    const alert: Alert = {
      active: true,
      message,
      level,
      timestamp: Date.now(),
    };

    this.data.alerts.push(alert);
    if (this.data.alerts.length > 100) {
      // Keep last 100 alerts
      this.data.alerts.shift();
    }

    const wsMessage: WebSocketMessage = {
      type: "alert",
      data: alert,
    };
    this.broadcastUpdate(wsMessage);
  }

  public dispose(): void {
    // Stop all active monitoring
    for (const sessionId of this.activeSessions) {
      this.stopMonitoring(sessionId);
    }

    // Close server and connections
    this.wss.close();
    this.server.close();
  }
}

export const dashboard = new PerformanceDashboard();
export default dashboard;
