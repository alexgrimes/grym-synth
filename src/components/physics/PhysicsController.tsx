import React from 'react';
import { EventEmitter } from 'events';
import { Preset } from './PresetManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import type { Vector3D } from '../parameters/types/StochasticTypes';

export interface PhysicsControllerProps {
  onParameterUpdate: (updates: Record<string, number>) => Promise<void>;
  onPerformanceWarning?: (warning: string) => void;
  performanceThresholds?: {
    maxFrameTime?: number;
    maxUpdateTime?: number;
    maxPhysicsTime?: number;
    maxRenderTime?: number;
    maxMemoryUsage?: number;
  };
}

export interface Field {
  id: string;
  position: Vector3D;
  strength: number;
  radius: number;
  decay: number;
}

export class PhysicsController extends React.Component<PhysicsControllerProps> {
  private fields: Map<string, Field>;
  private parameters: Map<string, number>;
  private performanceMonitor: PerformanceMonitor;
  private eventEmitter: EventEmitter;
  onParameterUpdate: PhysicsControllerProps['onParameterUpdate'];

  constructor(props: PhysicsControllerProps) {
    super(props);
    this.fields = new Map();
    this.parameters = new Map();
    this.onParameterUpdate = props.onParameterUpdate;
    this.eventEmitter = new EventEmitter();

    this.performanceMonitor = new PerformanceMonitor(props.performanceThresholds);
    if (props.onPerformanceWarning) {
      this.performanceMonitor.onWarning(props.onPerformanceWarning);
    }
  }

  // Event handling methods
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  public once(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.once(event, listener);
  }

  private emit(event: string, ...args: any[]): void {
    this.eventEmitter.emit(event, ...args);
  }

  async addField(fieldData: Omit<Field, 'id'>): Promise<string> {
    const startTime = this.performanceMonitor.startFrame();

    try {
      const fieldId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const field: Field = {
        id: fieldId,
        ...fieldData
      };

      this.fields.set(fieldId, field);
      await this.updatePhysics();

      // Emit field added event
      this.emit('fieldAdded', field);

      this.performanceMonitor.recordMetrics({
        updateTime: performance.now() - startTime,
        fieldCount: this.fields.size,
        parameterCount: this.parameters.size
      });

      return fieldId;
    } catch (error) {
      console.error('Error adding field:', error);
      throw error;
    }
  }

  async loadPreset(preset: Preset): Promise<void> {
    const startTime = this.performanceMonitor.startFrame();

    try {
      // Clear existing fields
      this.clearFields();

      // Add preset fields
      for (const field of preset.fields) {
        await this.addField(field);
      }

      // Update parameters
      for (const param of preset.parameters) {
        this.parameters.set(param.id, param.value);
      }

      await this.updatePhysics();

      this.performanceMonitor.recordMetrics({
        updateTime: performance.now() - startTime,
        fieldCount: this.fields.size,
        parameterCount: this.parameters.size
      });
    } catch (error) {
      console.error('Error loading preset:', error);
      throw error;
    }
  }

  async transitionPresets(from: Preset, to: Preset, duration: number): Promise<void> {
    const startTime = performance.now();
    const endTime = startTime + duration;

    const animate = async () => {
      const currentTime = performance.now();
      const progress = Math.min(1, (currentTime - startTime) / duration);

      if (progress < 1) {
        const frameStart = this.performanceMonitor.startFrame();
        await this.interpolatePresets(from, to, progress);

        this.performanceMonitor.recordMetrics({
          frameTime: performance.now() - frameStart,
          fieldCount: this.fields.size,
          parameterCount: this.parameters.size
        });

        requestAnimationFrame(() => animate());
      } else {
        await this.loadPreset(to);
      }
    };

    await animate();
  }

  clearFields(): void {
    this.fields.clear();
    this.updatePhysics().catch(console.error);
  }

  getPerformanceReport(): string {
    return this.performanceMonitor.getPerformanceReport();
  }

  private async interpolatePresets(from: Preset, to: Preset, progress: number): Promise<void> {
    const physicsStart = performance.now();

    // Clear current fields
    this.fields.clear();

    // Emit event for field clearing
    this.emit('fieldsCleared');

    // Interpolate fields
    for (let i = 0; i < Math.max(from.fields.length, to.fields.length); i++) {
      const fromField = from.fields[i];
      const toField = to.fields[i];

      if (fromField && toField) {
        // Create interpolated field data without ID (addField will assign one)
        const fieldData = {
          position: {
            x: fromField.position.x + (toField.position.x - fromField.position.x) * progress,
            y: fromField.position.y + (toField.position.y - fromField.position.y) * progress,
            z: fromField.position.z + (toField.position.z - fromField.position.z) * progress
          },
          strength: fromField.strength + (toField.strength - fromField.strength) * progress,
          radius: fromField.radius + (toField.radius - fromField.radius) * progress,
          decay: fromField.decay + (toField.decay - fromField.decay) * progress
        };

        // Add the field with the interpolated data
        await this.addField(fieldData);
      }
    }

    const physicsTime = performance.now() - physicsStart;
    const updateStart = performance.now();

    await this.updatePhysics();

    this.performanceMonitor.recordMetrics({
      physicsTime,
      updateTime: performance.now() - updateStart,
      fieldCount: this.fields.size,
      parameterCount: this.parameters.size
    });
  }

  private async updatePhysics(): Promise<void> {
    const startTime = performance.now();

    // Calculate field effects on parameters
    const updates: Record<string, number> = {};

    this.parameters.forEach((value, id) => {
      let newValue = value;
      this.fields.forEach(field => {
        // Apply field effects
        // This is a simplified version - the actual physics calculation
        // would be handled by the WebAssembly module
        newValue += field.strength * 0.1;
      });
      updates[id] = newValue;
    });

    await this.onParameterUpdate(updates);

    this.performanceMonitor.recordMetrics({
      physicsTime: performance.now() - startTime
    });
  }

  render() {
    return <div>Physics Controller Component</div>;
  }
}

export default PhysicsController;
