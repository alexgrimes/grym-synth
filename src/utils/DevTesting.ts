import { MetricsCollector } from './MetricsCollector';

interface SessionData {
  interactions: Array<{
    element: string;
    event: string;
    data: any;
    timestamp: number;
  }>;
  performance: Array<{
    feature: string;
    metrics: Record<string, number>;
    timestamp: number;
  }>;
}

class DevTesting {
  private static instance: DevTesting;
  private activeSession: SessionData | null = null;
  private features: Map<string, boolean> = new Map();
  private metricsCollector: MetricsCollector;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsUpdateInterval: number = 1000; // Update FPS every second
  private rafId: number | null = null;

  private constructor() {
    this.metricsCollector = new MetricsCollector();
    this.updateFPS = this.updateFPS.bind(this);
  }

  static getInstance(): DevTesting {
    if (!DevTesting.instance) {
      DevTesting.instance = new DevTesting();
    }
    return DevTesting.instance;
  }

  private updateFPS(timestamp: number): void {
    this.frameCount++;

    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed >= this.fpsUpdateInterval) {
      this.fps = (this.frameCount * 1000) / elapsed;
      this.frameCount = 0;
      this.lastFrameTime = timestamp;
    }

    this.rafId = requestAnimationFrame(this.updateFPS);
  }

  startSession(): void {
    if (this.activeSession) {
      console.warn('Session already in progress');
      return;
    }

    this.activeSession = {
      interactions: [],
      performance: []
    };

    // Start performance monitoring
    this.metricsCollector.startRecording();
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.rafId = requestAnimationFrame(this.updateFPS);
  }

  endSession(): SessionData | null {
    if (!this.activeSession) {
      console.warn('No active session to end');
      return null;
    }

    const sessionData = this.activeSession;
    this.activeSession = null;

    // Stop performance monitoring
    this.metricsCollector.stopRecording();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Store session data in localStorage
    try {
      const savedSessions = JSON.parse(localStorage.getItem('devTestingSessions') || '[]');
      savedSessions.push({
        ...sessionData,
        endTime: Date.now()
      });
      localStorage.setItem('devTestingSessions', JSON.stringify(savedSessions));
    } catch (error) {
      console.error('Failed to save session data:', error);
    }

    return sessionData;
  }

  logPerformance(feature: string, metrics: Record<string, number>): void {
    if (!this.activeSession) {
      console.warn('No active session for performance logging');
      return;
    }

    this.activeSession.performance.push({
      feature,
      metrics,
      timestamp: Date.now()
    });
  }

  captureInteraction(element: string, event: string, data: any): void {
    if (!this.activeSession) {
      console.warn('No active session for interaction capture');
      return;
    }

    this.activeSession.interactions.push({
      element,
      event,
      data,
      timestamp: Date.now()
    });
  }

  toggleFeature(featureName: string, enabled: boolean): void {
    this.features.set(featureName, enabled);
  }

  isFeatureEnabled(featureName: string): boolean {
    return this.features.get(featureName) || false;
  }

  getCurrentMetrics(): Record<string, number> {
    const metrics = this.metricsCollector.getMetrics();
    return {
      fps: this.fps,
      memory: metrics.memory.final,
      audioLatency: this.getAudioLatency()
    };
  }

  // Helper methods for accessing test data
  getSavedSessions(): Array<SessionData & { endTime: number }> {
    try {
      return JSON.parse(localStorage.getItem('devTestingSessions') || '[]');
    } catch (error) {
      console.error('Failed to retrieve saved sessions:', error);
      return [];
    }
  }

  private getAudioLatency(): number {
    // Placeholder for audio latency measurement
    // In a real implementation, this would measure actual audio processing latency
    return 0;
  }

  exportSessionData(): string {
    const sessions = this.getSavedSessions();
    return JSON.stringify(sessions, null, 2);
  }
}

export const devTesting = DevTesting.getInstance();
