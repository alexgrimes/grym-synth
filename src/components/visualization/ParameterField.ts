import { Vector3D } from '../parameters/types/StochasticTypes';

/**
 * A class representing a gravitational parameter field, implementing Xenakis'
 * concepts of attraction and repulsion in parameter space.
 */
export class ParameterField {
  private position: Vector3D;
  private strength: number;
  private radius: number;
  private decay: number;
  private readonly createdAt: number;
  private lastUpdateTime: number;

  constructor(
    position: Vector3D,
    strength: number = 1.0,
    radius: number = 0.2,
    decay: number = 0.95
  ) {
    this.position = position;
    this.strength = strength;
    this.radius = radius;
    this.decay = decay;
    this.createdAt = performance.now();
    this.lastUpdateTime = this.createdAt;
  }

  /**
   * Calculate the force vector applied to a point in parameter space
   */
  calculateForce(point: Vector3D): Vector3D {
    const dx = this.position.x - point.x;
    const dy = this.position.y - point.y;
    const dz = this.position.z - point.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance >= this.radius) {
      return { x: 0, y: 0, z: 0 };
    }

    const forceMagnitude = (this.strength * (this.radius - distance)) / this.radius;
    return {
      x: dx * forceMagnitude,
      y: dy * forceMagnitude,
      z: dz * forceMagnitude
    };
  }

  /**
   * Update field strength based on decay rate and time delta
   */
  update(): boolean {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;

    this.strength *= Math.pow(this.decay, deltaTime);

    // Return false if field should be removed
    return this.strength > 0.01;
  }

  /**
   * Get the current field parameters
   */
  getParameters() {
    return {
      position: this.position,
      strength: this.strength,
      radius: this.radius,
      age: this.lastUpdateTime - this.createdAt
    };
  }

  /**
   * Check if a point is within the field's influence
   */
  isPointInRange(point: Vector3D): boolean {
    const dx = this.position.x - point.x;
    const dy = this.position.y - point.y;
    const dz = this.position.z - point.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    return distanceSquared <= this.radius * this.radius;
  }

  /**
   * Calculate potential energy at a point
   */
  calculatePotential(point: Vector3D): number {
    const dx = this.position.x - point.x;
    const dy = this.position.y - point.y;
    const dz = this.position.z - point.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance >= this.radius) {
      return 0;
    }

    // Use inverse square law for gravitational potential
    return -this.strength * (1 - distance / this.radius);
  }

  /**
   * Modify field parameters
   */
  modifyField(params: {
    position?: Vector3D;
    strength?: number;
    radius?: number;
    decay?: number;
  }) {
    if (params.position) this.position = params.position;
    if (params.strength) this.strength = params.strength;
    if (params.radius) this.radius = params.radius;
    if (params.decay) this.decay = params.decay;
  }

  /**
   * Get normalized influence value at a point (0 to 1)
   */
  getInfluenceAtPoint(point: Vector3D): number {
    const dx = this.position.x - point.x;
    const dy = this.position.y - point.y;
    const dz = this.position.z - point.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance >= this.radius) {
      return 0;
    }

    return (1 - distance / this.radius) * this.strength;
  }
}
