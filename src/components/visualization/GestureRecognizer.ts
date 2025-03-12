import { Vector3D } from '../parameters/types/StochasticTypes';

export interface GesturePoint {
  position: Vector3D;
  timestamp: number;
  force?: number;
}

export interface RecognizedGesture {
  type: GestureType;
  points: GesturePoint[];
  startTime: number;
  endTime: number;
  confidence: number;
  parameters: Record<string, number>;
}

export type GestureType =
  | 'tap'
  | 'longPress'
  | 'swipe'
  | 'pinch'
  | 'rotate'
  | 'circle'
  | 'spiral';

export class GestureRecognizer {
  private gestureHistory: GesturePoint[] = [];
  private readonly historyDuration = 1000; // Keep 1 second of history
  private readonly minGesturePoints = 3;
  private readonly maxGesturePoints = 100;

  /**
   * Add a new gesture point to the history
   */
  addPoint(point: GesturePoint) {
    const currentTime = performance.now();

    // Clean up old points
    this.gestureHistory = this.gestureHistory.filter(
      p => currentTime - p.timestamp < this.historyDuration
    );

    // Add new point
    this.gestureHistory.push(point);

    // Limit history size
    if (this.gestureHistory.length > this.maxGesturePoints) {
      this.gestureHistory.shift();
    }
  }

  /**
   * Analyze current gesture history and recognize patterns
   */
  analyzeGesture(): RecognizedGesture | null {
    if (this.gestureHistory.length < this.minGesturePoints) {
      return null;
    }

    // Try to recognize gestures in order of complexity
    return (
      this.recognizeCircle() ||
      this.recognizeSpiral() ||
      this.recognizeSwipe() ||
      this.recognizePinch() ||
      this.recognizeRotate() ||
      this.recognizeLongPress() ||
      this.recognizeTap()
    );
  }

  private recognizeCircle(): RecognizedGesture | null {
    const points = this.gestureHistory;
    if (points.length < 8) return null;

    // Calculate center point
    const center = points.reduce(
      (acc, p) => ({
        x: acc.x + p.position.x,
        y: acc.y + p.position.y,
        z: acc.z + p.position.z
      }),
      { x: 0, y: 0, z: 0 }
    );

    center.x /= points.length;
    center.y /= points.length;
    center.z /= points.length;

    // Calculate average radius and deviation
    const radii = points.map(p =>
      Math.sqrt(
        Math.pow(p.position.x - center.x, 2) +
        Math.pow(p.position.y - center.y, 2)
      )
    );

    const avgRadius = radii.reduce((a, b) => a + b) / radii.length;
    const radiusDeviation = Math.sqrt(
      radii.reduce((acc, r) => acc + Math.pow(r - avgRadius, 2), 0) / radii.length
    );

    // Check if points form a relatively consistent circle
    const isCircle = radiusDeviation / avgRadius < 0.2;

    if (!isCircle) return null;

    return {
      type: 'circle',
      points: [...points],
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      confidence: 1 - (radiusDeviation / avgRadius),
      parameters: {
        radius: avgRadius,
        centerX: center.x,
        centerY: center.y
      }
    };
  }

  private recognizeSpiral(): RecognizedGesture | null {
    const points = this.gestureHistory;
    if (points.length < 12) return null;

    // Calculate radius change over time
    const radii = points.map((p, i) => {
      if (i === 0) return 0;
      const prev = points[i - 1].position;
      return Math.sqrt(
        Math.pow(p.position.x - prev.x, 2) +
        Math.pow(p.position.y - prev.y, 2)
      );
    });

    // Check for consistent radius increase/decrease
    const radiusChanges = radii.slice(1).map((r, i) => r - radii[i]);
    const avgChange = radiusChanges.reduce((a, b) => a + b) / radiusChanges.length;
    const changeConsistency = radiusChanges.every(c => Math.sign(c) === Math.sign(avgChange));

    if (!changeConsistency) return null;

    return {
      type: 'spiral',
      points: [...points],
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      confidence: 0.8,
      parameters: {
        radiusChange: avgChange,
        direction: Math.sign(avgChange)
      }
    };
  }

  private recognizeSwipe(): RecognizedGesture | null {
    const points = this.gestureHistory;
    if (points.length < 3) return null;

    // Calculate overall direction and distance
    const start = points[0].position;
    const end = points[points.length - 1].position;
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) +
      Math.pow(end.y - start.y, 2)
    );

    // Calculate path linearity
    const deviation = points.reduce((acc, p) => {
      const expectedY = start.y + (p.position.x - start.x) * ((end.y - start.y) / (end.x - start.x));
      return acc + Math.abs(p.position.y - expectedY);
    }, 0) / points.length;

    // Check if motion is mostly linear
    const isSwipe = deviation / distance < 0.2;

    if (!isSwipe) return null;

    return {
      type: 'swipe',
      points: [...points],
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      confidence: 1 - (deviation / distance),
      parameters: {
        distance,
        angle: Math.atan2(end.y - start.y, end.x - start.x),
        velocity: distance / (points[points.length - 1].timestamp - points[0].timestamp)
      }
    };
  }

  private recognizePinch(): RecognizedGesture | null {
    // Implement pinch recognition
    return null;
  }

  private recognizeRotate(): RecognizedGesture | null {
    // Implement rotation recognition
    return null;
  }

  private recognizeLongPress(): RecognizedGesture | null {
    const points = this.gestureHistory;
    if (points.length < 2) return null;

    const duration = points[points.length - 1].timestamp - points[0].timestamp;
    const maxMovement = Math.max(...points.slice(1).map((p, i) =>
      Math.sqrt(
        Math.pow(p.position.x - points[i].position.x, 2) +
        Math.pow(p.position.y - points[i].position.y, 2)
      )
    ));

    const isLongPress = duration > 500 && maxMovement < 0.1;

    if (!isLongPress) return null;

    return {
      type: 'longPress',
      points: [...points],
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      confidence: 0.9,
      parameters: {
        duration,
        pressure: points[points.length - 1].force || 1.0
      }
    };
  }

  private recognizeTap(): RecognizedGesture | null {
    const points = this.gestureHistory;
    if (points.length < 2) return null;

    const duration = points[points.length - 1].timestamp - points[0].timestamp;
    const maxMovement = Math.max(...points.slice(1).map((p, i) =>
      Math.sqrt(
        Math.pow(p.position.x - points[i].position.x, 2) +
        Math.pow(p.position.y - points[i].position.y, 2)
      )
    ));

    const isTap = duration < 200 && maxMovement < 0.1;

    if (!isTap) return null;

    return {
      type: 'tap',
      points: [...points],
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      confidence: 1.0,
      parameters: {
        duration,
        pressure: points[points.length - 1].force || 1.0
      }
    };
  }

  /**
   * Clear gesture history
   */
  reset() {
    this.gestureHistory = [];
  }
}
