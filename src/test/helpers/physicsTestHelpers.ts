import { Vector3D } from '../../components/parameters/types/StochasticTypes';

export interface TestField {
  position: Vector3D;
  strength: number;
  radius: number;
  decay: number;
}

export const createTestField = (
  x = 0,
  y = 0,
  z = 0,
  strength = 1.0,
  radius = 0.5,
  decay = 0.95
): TestField => ({
  position: { x, y, z },
  strength,
  radius,
  decay
});

export const simulateGestureSequence = async (
  element: HTMLElement,
  points: Array<{ x: number; y: number; pressure?: number }>,
  duration: number
) => {
  const stepTime = duration / points.length;
  let currentTime = 0;

  for (const point of points) {
    const event = new PointerEvent('pointermove', {
      clientX: point.x,
      clientY: point.y,
      pressure: point.pressure || 1.0,
      pointerType: 'touch',
      isPrimary: true
    });

    element.dispatchEvent(event);
    currentTime += stepTime;
    await new Promise(resolve => setTimeout(resolve, stepTime));
  }
};

export const createCircularGesture = (
  centerX: number,
  centerY: number,
  radius: number,
  steps = 32
): Array<{ x: number; y: number }> => {
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    });
  }

  return points;
};

export const createSpiralGesture = (
  centerX: number,
  centerY: number,
  startRadius: number,
  endRadius: number,
  steps = 32
): Array<{ x: number; y: number }> => {
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 4; // Two full rotations
    const radius = startRadius + ((endRadius - startRadius) * i) / steps;
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    });
  }

  return points;
};

export const measureUpdateLatency = async (
  callback: () => Promise<void>,
  iterations = 10
): Promise<{ average: number; max: number; min: number }> => {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await callback();
    const end = performance.now();
    latencies.push(end - start);
  }

  return {
    average: latencies.reduce((a, b) => a + b) / latencies.length,
    max: Math.max(...latencies),
    min: Math.min(...latencies)
  };
};

export const verifyParameterBounds = (
  value: number,
  min: number,
  max: number,
  epsilon = 1e-6
): boolean => {
  return value >= min - epsilon && value <= max + epsilon;
};

export const createTestParameters = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `param-${i}`,
    value: Math.random(),
    min: 0,
    max: 1,
    default: 0.5,
    type: 'continuous' as const,
    metadata: {
      name: `Test Parameter ${i}`
    }
  }));
};

export const waitForPhysicsUpdate = () =>
  new Promise(resolve => setTimeout(resolve, 16)); // One frame at 60fps

export const expectSmoothing = (values: number[], maxJump = 0.1) => {
  for (let i = 1; i < values.length; i++) {
    const delta = Math.abs(values[i] - values[i - 1]);
    expect(delta).toBeLessThanOrEqual(maxJump);
  }
};

export const detectOscillation = (values: number[], threshold = 0.01) => {
  let oscillations = 0;
  let lastDelta = 0;

  for (let i = 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    if (Math.abs(delta) > threshold && Math.sign(delta) !== Math.sign(lastDelta)) {
      oscillations++;
    }
    lastDelta = delta;
  }

  return oscillations;
};
