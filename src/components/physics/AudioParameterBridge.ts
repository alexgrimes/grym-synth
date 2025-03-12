import { EventEmitter } from 'events';
import type { Vector3D } from '../parameters/types/StochasticTypes';
import type { PhysicsController } from './PhysicsController';
import type {
  StochasticParameter,
  SpectralParameter,
  MarkovParameter
} from '../parameters/types/StochasticTypes';
import { SpectroMorphAnalyzer, SpectroMorphAnalysis } from '../visualization/SpectroMorphAnalyzer';

interface AudioParameter {
  id: string;
  value: number;
  min: number;
  max: number;
  default: number;
  type: 'continuous' | 'discrete' | 'trigger';
  metadata?: {
    name: string;
    description?: string;
    group?: string;
    xenakisReference?: string;
  };
}

interface ParameterUpdate {
  parameterId: string;
  value: number;
  timestamp: number;
}

interface FieldState {
  position: Vector3D;
  strength: number;
  radius: number;
  affectedParameters: Set<string>;
}

// XenakisLDM interface for audio engine integration
export interface XenakisLDM {
  setParameter(parameterId: string, value: number): Promise<void>;
  getParameter(parameterId: string): Promise<number>;
  getAvailableParameters(): Promise<AudioParameter[]>;
  startAudio(): Promise<void>;
  stopAudio(): Promise<void>;
  setStochasticDistribution(
    parameterId: string,
    distribution: StochasticParameter['distribution']
  ): Promise<void>;
  setSpectralEnvelope(
    parameterId: string,
    envelope: SpectralParameter['envelope']
  ): Promise<void>;
  setMarkovChain(
    parameterId: string,
    states: MarkovParameter['states'],
    transitionMatrix: MarkovParameter['transitionMatrix']
  ): Promise<void>;
  getAudioAnalysis(): Promise<{
    spectralCentroid: number;
    spectralFlux: number;
    rms: number;
    zeroCrossingRate: number;
    [key: string]: number;
  }>;
  // New methods for Xenakis techniques
  setGranularParameters?(
    parameterId: string,
    grainSize: number,
    density: number,
    randomization: number
  ): Promise<void>;
  setStochasticWalk?(
    parameterId: string,
    stepSize: number,
    bounds: [number, number],
    tendency: number
  ): Promise<void>;
  setGameTheoryModel?(
    parameterIds: string[],
    payoffMatrix: number[][],
    strategyWeights: number[]
  ): Promise<void>;
  getRawAudioData?(): Promise<Float32Array>;
}

/**
 * AudioParameterBridge connects the gravitational parameter interface
 * with the XenakisLDM audio engine, ensuring synchronized parameter control
 * and real-time updates.
 */
export class AudioParameterBridge extends EventEmitter {
  private parameters: Map<string, AudioParameter>;
  private activeFields: Map<string, FieldState>;
  private lastUpdateTime: number;
  private readonly updateThreshold = 16; // ~60fps in ms
  private parameterSpace: Map<string, Vector3D>;
  private readonly latencyBuffer: ParameterUpdate[] = [];
  private syncLoopActive: boolean = false;
  private syncIntervalId: number | null = null;
  private audioAnalysisData: Record<string, number> = {};
  private readonly physicsController: PhysicsController;
  private readonly audioEngine: XenakisLDM;
  private spectroMorphAnalyzer: SpectroMorphAnalyzer;
  private lastSpectroMorphAnalysis: SpectroMorphAnalysis | null = null;
  private bidirectionalMappings: Map<string, {
    audioFeature: string;
    fieldProperty: 'strength' | 'radius';
    fieldId: string;
    scaleFactor: number;
  }> = new Map();
  private stochasticProcesses: Map<string, {
    type: 'markov' | 'randomWalk' | 'granular' | 'gameTheory';
    active: boolean;
    lastUpdate: number;
    updateInterval: number;
    config: any;
  }> = new Map();

  constructor(physicsController: PhysicsController, audioEngine: XenakisLDM) {
    super();
    this.parameters = new Map();
    this.activeFields = new Map();
    this.parameterSpace = new Map();
    this.lastUpdateTime = performance.now();
    this.physicsController = physicsController;
    this.audioEngine = audioEngine;
    this.spectroMorphAnalyzer = new SpectroMorphAnalyzer();

    this.setupParameterMapping();
    this.startSyncLoop();

    // Set up spectromorphology analyzer event listener
    this.spectroMorphAnalyzer.on('analysisComplete', (analysis: SpectroMorphAnalysis) => {
      this.lastSpectroMorphAnalysis = analysis;
      this.emit('spectromorphAnalysisUpdated', analysis);
      this.applySpectromorphAnalysisToFields(analysis);
    });
  }

  /**
   * Set up bidirectional parameter mapping between physics and audio
   */
  private async setupParameterMapping(): Promise<void> {
    try {
      // Get available parameters from audio engine
      const availableParameters = await this.audioEngine.getAvailableParameters();

      // Register parameters with spatial positions
      for (const param of availableParameters) {
        // Create a spatial position based on parameter characteristics
        // This is a more sophisticated mapping based on parameter semantics
        const position: Vector3D = this.calculateParameterPosition(param);
        this.registerParameter(param, position);
      }

      // Set up event listeners for physics controller updates
      this.physicsController.on('fieldAdded', (field) => {
        this.updateField(field.id, {
          position: field.position,
          strength: field.strength,
          radius: field.radius,
          affectedParameters: new Set()
        });
      });

      this.physicsController.on('fieldRemoved', (fieldId) => {
        this.removeField(fieldId);
      });

      this.physicsController.on('fieldUpdated', (field) => {
        this.updateField(field.id, {
          position: field.position,
          strength: field.strength,
          radius: field.radius,
          affectedParameters: this.activeFields.get(field.id)?.affectedParameters || new Set()
        });
      });

      // Set up event listeners for audio engine updates
      this.on('parameterUpdates', async (updates: ParameterUpdate[]) => {
        for (const update of updates) {
          await this.audioEngine.setParameter(update.parameterId, update.value);
        }
      });

    } catch (error) {
      console.error('Error setting up parameter mapping:', error);
      throw error;
    }
  }

  /**
   * Calculate parameter position in 3D space based on its characteristics
   */
  private calculateParameterPosition(param: AudioParameter): Vector3D {
    // Extract semantic information from parameter metadata
    const group = param.metadata?.group || '';
    const name = param.metadata?.name || '';
    const isFrequency = group.includes('frequency') ||
                       name.toLowerCase().includes('freq') ||
                       name.toLowerCase().includes('pitch');
    const isAmplitude = group.includes('amplitude') ||
                       name.toLowerCase().includes('amp') ||
                       name.toLowerCase().includes('volume') ||
                       name.toLowerCase().includes('gain');
    const isTime = group.includes('time') ||
                  name.toLowerCase().includes('time') ||
                  name.toLowerCase().includes('delay') ||
                  name.toLowerCase().includes('duration');
    const isFilter = group.includes('filter') ||
                    name.toLowerCase().includes('filter') ||
                    name.toLowerCase().includes('eq');

    // Calculate normalized range
    const range = param.max - param.min;
    const normalizedDefault = range !== 0 ?
      (param.default - param.min) / range : 0.5;

    // Base position with some randomization for natural distribution
    let x = 0.5 + (Math.random() * 0.4 - 0.2);
    let y = 0.5 + (Math.random() * 0.4 - 0.2);
    let z = 0.5 + (Math.random() * 0.4 - 0.2);

    // Adjust position based on parameter characteristics
    if (isFrequency) {
      x = 0.7 + (Math.random() * 0.2);
      y = normalizedDefault * 0.8 + 0.1;
    } else if (isAmplitude) {
      x = 0.3 + (Math.random() * 0.2);
      y = normalizedDefault * 0.8 + 0.1;
    } else if (isTime) {
      z = 0.7 + (Math.random() * 0.2);
      x = normalizedDefault * 0.8 + 0.1;
    } else if (isFilter) {
      y = 0.7 + (Math.random() * 0.2);
      x = normalizedDefault * 0.8 + 0.1;
    }

    return { x, y, z };
  }

  /**
   * Start the synchronization loop between physics and audio
   */
  private startSyncLoop(): void {
    if (this.syncLoopActive) return;

    this.syncLoopActive = true;

    // Use requestAnimationFrame for better performance
    const syncLoop = async () => {
      if (!this.syncLoopActive) return;

      try {
        const currentTime = performance.now();

        // Update parameters based on physics state
        this.calculateParameterUpdates();

        // Update stochastic processes
        this.updateStochasticProcesses(currentTime);

        // Get audio analysis data for visualization feedback
        this.audioAnalysisData = await this.audioEngine.getAudioAnalysis();

        // Perform spectromorphological analysis if raw audio data is available
        if (this.audioEngine.getRawAudioData) {
          const rawAudioData = await this.audioEngine.getRawAudioData();
          this.spectroMorphAnalyzer.analyzeAudioData(rawAudioData);
        }

        // Emit audio analysis data for visualization
        this.emit('audioAnalysisUpdated', this.audioAnalysisData);

        // Schedule next update
        requestAnimationFrame(syncLoop);
      } catch (error) {
        console.error('Error in sync loop:', error);
        this.syncLoopActive = false;
      }
    };

    // Start the loop
    syncLoop();
  }

  /**
   * Stop the synchronization loop
   */
  public stopSyncLoop(): void {
    this.syncLoopActive = false;

    if (this.syncIntervalId !== null) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  /**
   * Register an audio parameter for gravitational control
   */
  registerParameter(parameter: AudioParameter, position: Vector3D): void {
    this.parameters.set(parameter.id, parameter);
    this.parameterSpace.set(parameter.id, position);
    this.emit('parameterRegistered', { parameter, position });
  }

  /**
   * Update field state and calculate parameter influences
   */
  updateField(fieldId: string, state: FieldState): void {
    this.activeFields.set(fieldId, state);
    this.calculateParameterUpdates();
  }

  /**
   * Remove a field from the system
   */
  removeField(fieldId: string): void {
    this.activeFields.delete(fieldId);
    this.calculateParameterUpdates();
    this.emit('fieldRemoved', fieldId);
  }

  /**
   * Calculate parameter updates based on field influences
   */
  private calculateParameterUpdates(): void {
    const currentTime = performance.now();
    if (currentTime - this.lastUpdateTime < this.updateThreshold) {
      return; // Throttle updates to maintain performance
    }

    const updates: ParameterUpdate[] = [];

    // Reset affected parameters tracking
    for (const field of this.activeFields.values()) {
      field.affectedParameters.clear();
    }

    // Calculate influence of all fields on each parameter
    for (const [parameterId, position] of this.parameterSpace) {
      let totalInfluence = 0;
      let weightedValue = 0;
      const parameter = this.parameters.get(parameterId);

      if (!parameter) continue;

      for (const field of this.activeFields.values()) {
        const distance = this.calculateDistance(position, field.position);
        if (distance < field.radius) {
          const influence = this.calculateInfluence(distance, field);
          totalInfluence += influence;
          weightedValue += influence * field.strength;

          // Track which parameters are affected by this field
          field.affectedParameters.add(parameterId);
        }
      }

      if (totalInfluence > 0) {
        const normalizedValue = weightedValue / totalInfluence;
        const scaledValue = this.scaleValue(
          normalizedValue,
          parameter.min,
          parameter.max
        );

        updates.push({
          parameterId,
          value: scaledValue,
          timestamp: currentTime
        });
      }
    }

    // Buffer updates for latency compensation
    this.latencyBuffer.push(...updates);
    while (this.latencyBuffer.length > 0 &&
           currentTime - this.latencyBuffer[0].timestamp > 200) {
      this.latencyBuffer.shift();
    }

    // Apply updates to audio engine
    this.applyParameterUpdates(updates);

    // Emit updates for UI and visualization
    if (updates.length > 0) {
      this.emit('parameterUpdates', updates);
    }

    this.lastUpdateTime = currentTime;
  }

  /**
   * Apply parameter updates to the audio engine
   */
  private async applyParameterUpdates(updates: ParameterUpdate[]): Promise<void> {
    try {
      // Group updates by parameter for efficiency
      const parameterUpdates: Record<string, number> = {};

      for (const update of updates) {
        parameterUpdates[update.parameterId] = update.value;
      }

      // Apply updates in batches where possible
      const updatePromises: Promise<void>[] = [];

      for (const [parameterId, value] of Object.entries(parameterUpdates)) {
        updatePromises.push(this.audioEngine.setParameter(parameterId, value));
      }

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error applying parameter updates to audio engine:', error);
      this.emit('error', { message: 'Failed to update audio parameters', error });
    }
  }

  /**
   * Calculate distance between two points in parameter space
   */
  private calculateDistance(a: Vector3D, b: Vector3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate field influence based on distance
   */
  private calculateInfluence(distance: number, field: FieldState): number {
    // Use a smoother falloff curve for more organic feel
    const normalizedDistance = distance / field.radius;
    return Math.max(0, 1 - Math.pow(normalizedDistance, 2));
  }

  /**
   * Scale normalized value to parameter range
   */
  private scaleValue(normalized: number, min: number, max: number): number {
    return min + (max - min) * normalized;
  }

  /**
   * Get current parameter values
   */
  getParameterValues(): Map<string, number> {
    const values = new Map<string, number>();
    for (const [parameterId, parameter] of this.parameters) {
      const updates = this.latencyBuffer
        .filter(update => update.parameterId === parameterId)
        .sort((a, b) => b.timestamp - a.timestamp);

      values.set(
        parameterId,
        updates.length > 0 ? updates[0].value : parameter.default
      );
    }
    return values;
  }

  /**
   * Get parameter space visualization data
   */
  getVisualizationData() {
    return {
      parameters: Array.from(this.parameters.entries()).map(([id, param]) => ({
        id,
        position: this.parameterSpace.get(id),
        metadata: param.metadata,
        value: this.getParameterValues().get(id) || param.default
      })),
      fields: Array.from(this.activeFields.entries()).map(([id, field]) => ({
        id,
        ...field,
        affectedParameterCount: field.affectedParameters.size
      })),
      audioAnalysis: this.audioAnalysisData,
      spectromorphAnalysis: this.lastSpectroMorphAnalysis
    };
  }

  /**
   * Clear all fields and reset parameters
   */
  reset(): void {
    this.activeFields.clear();
    this.latencyBuffer.length = 0;
    this.emit('reset');
    this.calculateParameterUpdates();
  }

  /**
   * Get real-time audio analysis data
   */
  getAudioAnalysisData(): Record<string, number> {
    return { ...this.audioAnalysisData };
  }

  /**
   * Get spectromorphological analysis data
   */
  getSpectromorphAnalysis(): SpectroMorphAnalysis | null {
    return this.lastSpectroMorphAnalysis;
  }

  /**
   * Map a specific parameter to a field
   */
  mapParameterToField(parameterId: string, fieldId: string, weight: number = 1.0): boolean {
    const parameter = this.parameters.get(parameterId);
    const field = this.activeFields.get(fieldId);

    if (!parameter || !field) {
      return false;
    }

    // Add parameter to field's affected parameters
    field.affectedParameters.add(parameterId);

    // Recalculate parameter updates
    this.calculateParameterUpdates();

    this.emit('parameterMapped', { parameterId, fieldId, weight });
    return true;
  }

  /**
   * Unmap a parameter from a field
   */
  unmapParameterFromField(parameterId: string, fieldId: string): boolean {
    const field = this.activeFields.get(fieldId);

    if (!field) {
      return false;
    }

    // Remove parameter from field's affected parameters
    const result = field.affectedParameters.delete(parameterId);

    if (result) {
      // Recalculate parameter updates
      this.calculateParameterUpdates();
      this.emit('parameterUnmapped', { parameterId, fieldId });
    }

    return result;
  }

  /**
   * Create a bidirectional mapping between audio analysis and field properties
   */
  createBidirectionalMapping(
    audioFeature: string,
    fieldProperty: 'strength' | 'radius',
    fieldId: string,
    scaleFactor: number = 1.0
  ): void {
    // Store the mapping
    this.bidirectionalMappings.set(
      `${fieldId}-${fieldProperty}`,
      { audioFeature, fieldProperty, fieldId, scaleFactor }
    );

    // Set up a listener for audio analysis updates
    this.on('audioAnalysisUpdated', (analysisData) => {
      const field = this.activeFields.get(fieldId);
      if (!field || !analysisData[audioFeature]) return;

      // Scale the audio feature value to an appropriate range for the field property
      const scaledValue = analysisData[audioFeature] * scaleFactor;

      // Update the field property
      if (fieldProperty === 'strength') {
        field.strength = Math.min(1.0, Math.max(0.1, scaledValue));
      } else if (fieldProperty === 'radius') {
        field.radius = Math.min(1.0, Math.max(0.1, scaledValue));
      }

      // Update the field
      this.updateField(fieldId, field);
    });

    this.emit('bidirectionalMappingCreated', { audioFeature, fieldProperty, fieldId });
  }

  /**
   * Apply spectromorphological analysis to field properties
   */
  private applySpectromorphAnalysisToFields(analysis: SpectroMorphAnalysis): void {
    // Skip if no fields are active
    if (this.activeFields.size === 0) return;

    // Get field IDs
    const fieldIds = Array.from(this.activeFields.keys());

    // Apply spectral typology to field properties
    this.applySpectralTypologyToFields(analysis.spectralTypology, fieldIds);

    // Apply spectral motion to field positions
    this.applySpectralMotionToFields(analysis.spectralMotion, fieldIds);

    // Apply morphological model to field strengths
    this.applyMorphologicalModelToFields(analysis.morphologicalModel, fieldIds);
  }

  /**
   * Apply spectral typology to field properties
   */
  private applySpectralTypologyToFields(
    typology: SpectroMorphAnalysis['spectralTypology'],
    fieldIds: string[]
  ): void {
    // Skip if no fields
    if (fieldIds.length === 0) return;

    // Select a subset of fields to modify based on typology
    const fieldsToModify = Math.max(1, Math.floor(fieldIds.length * typology.position));
    const selectedFieldIds = fieldIds.slice(0, fieldsToModify);

    for (const fieldId of selectedFieldIds) {
      const field = this.activeFields.get(fieldId);
      if (!field) continue;

      // Modify field radius based on typology
      // Note-like sounds have smaller, more focused fields
      // Noise-like sounds have larger, more diffuse fields
      const baseRadius = 0.3 + typology.position * 0.7;
      field.radius = baseRadius * (0.8 + Math.random() * 0.4);

      this.updateField(fieldId, field);
    }
  }

  /**
   * Apply spectral motion to field positions
   */
  private applySpectralMotionToFields(
    motion: SpectroMorphAnalysis['spectralMotion'],
    fieldIds: string[]
  ): void {
    // Skip if no fields
    if (fieldIds.length === 0) return;

    // Apply different motion patterns based on type
    switch (motion.type) {
      case 'linear':
        // Move fields in a consistent direction
        this.applyLinearMotion(fieldIds, motion.intensity);
        break;
      case 'parabola':
        // Move fields in a curved pattern
        this.applyParabolicMotion(fieldIds, motion.intensity);
        break;
      case 'oscillation':
        // Move fields in a regular oscillating pattern
        this.applyOscillationMotion(fieldIds, motion.intensity, motion.rate);
        break;
      case 'undulation':
        // Move fields in an irregular oscillating pattern
        this.applyUndulationMotion(fieldIds, motion.intensity, motion.rate);
        break;
      case 'iteration':
        // Move fields in discrete steps
        this.applyIterationMotion(fieldIds, motion.intensity, motion.rate);
        break;
      case 'turbulence':
        // Move fields chaotically
        this.applyTurbulenceMotion(fieldIds, motion.intensity);
        break;
    }
  }

  /**
   * Apply linear motion to fields
   */
  private applyLinearMotion(fieldIds: string[], intensity: number): void {
    const direction = { x: 0.01, y: 0.01, z: 0 };
    const speed = intensity * 0.02;

    for (const fieldId of fieldIds) {
      const field = this.activeFields.get(fieldId);
      if (!field) continue;

      // Move field in the direction
      field.position.x += direction.x * speed;
      field.position.y += direction.y * speed;
      field.position.z += direction.z * speed;

      // Wrap around if out of bounds
      field.position.x = (field.position.x + 1) % 1;
      field.position.y = (field.position.y + 1) % 1;
      field.position.z = (field.position.z + 1) % 1;

      this.updateField(fieldId, field);
    }
  }

  /**
   * Apply parabolic motion to fields
   */
  private applyParabolicMotion(fieldIds: string[], intensity: number): void {
    const time = performance.now() / 1000;
    const speed = intensity * 0.02;

    for (const fieldId of fieldIds) {
      const field = this.activeFields.get(fieldId);
      if (!field) continue;

      // Calculate parabolic trajectory
      const x = (time * speed) % 1;
      const y = 4 * x * (1 - x);

      // Update field position
      field.position.x = x;
      field.position.y = y;

      this.updateField(fieldId, field);
    }
  }

  /**
   * Apply oscillation motion to fields
   */
  private applyOscillationMotion(fieldIds: string[], intensity: number, rate: number): void {
    const time = performance.now() / 1000;
    const frequency = rate * 2;
    const amplitude = intensity * 0.1;

    for (const fieldId of fieldIds) {
      const field = this.activeFields.get(fieldId);
      if (!field) continue;

      // Calculate oscillation
      const offset = Math.sin(time * frequency) * amplitude;

      // Update field position
      field.position.x = (field.position.x + offset + 1) % 1;

      this.updateField(fieldId, field);
    }
  }

  /**
   * Apply undulation motion to fields
   */
  private applyUndulationMotion(fieldIds: string[], intensity: number, rate: number): void {
    const time = performance.now() / 1000;
    const frequency1 = rate * 2;
    const frequency2 = rate * 3.7;
    const amplitude = intensity * 0.1;

    for (const fieldId of fieldIds) {
      const field = this.activeFields.get(fieldId);
      if (!field) continue;

      // Calculate complex undulation
      const offsetX = Math.sin(time * frequency1) * amplitude;
      const offsetY = Math.sin(time * frequency2) * amplitude;

      // Update field position
      field.position.x = (field.position.x + offsetX + 1) % 1;
      field.position.y = (field.position.y + offsetY + 1) % 1;

      this.updateField(fieldId, field);
    }
  }

  /**
   * Apply iteration motion to fields
   */
  private applyIterationMotion(fieldIds: string[], intensity: number, rate: number): void {
    const time = performance.now() / 1000;
    const stepInterval = 1 / (rate * 2);
    const stepSize = intensity * 0.05;

    // Only move on discrete steps
    if (Math.floor(time / stepInterval) !== Math.floor((time - 0.016) / stepInterval)) {
      for (const fieldId of fieldIds) {
        const field = this.activeFields.get(fieldId);
        if (!field) continue;

        // Random direction for each step
        const angle = Math.random() * Math.PI * 2;
        const offsetX = Math.cos(angle) * stepSize;
        const offsetY = Math.sin(angle) * stepSize;

        // Update field position
        field.position.x = (field.position.x + offsetX + 1) % 1;
        field.position.y = (field.position.y + offsetY + 1) % 1;

        this.updateField(fieldId, field);
      }
    }
  }

  /**
   * Apply turbulence motion to fields
   */
  private applyTurbulenceMotion(fieldIds: string[], intensity: number): void {
    const turbulenceScale = intensity * 0.03;

    for (const fieldId of fieldIds) {
      const field = this.activeFields.get(fieldId);
      if (!field) continue;

      // Random movement for each field
      const offsetX = (Math.random() * 2 - 1) * turbulenceScale;
      const offsetY = (Math.random() * 2 - 1) * turbulenceScale;

      // Update field position
      field.position.x = (field.position.x + offsetX + 1) % 1;
      field.position.y = (field.position.y + offsetY + 1) % 1;

      this.updateField(fieldId, field);
    }
  }

  /**
   * Apply morphological model to field strengths
   */
  private applyMorphologicalModelToFields(
    model: SpectroMorphAnalysis['morphologicalModel'],
    fieldIds: string[]
  ): void {
    // Skip if no fields
    if (fieldIds.length === 0) return;

    // Apply different behaviors based on morphological phase
    switch (model.phase) {
      case 'onset':
        // Increasing field strengths
        for (const fieldId of fieldIds) {
          const field = this.activeFields.get(fieldId);
          if (!field) continue;

          // Gradually increase strength
          field.strength = Math.min(1.0, field.strength + model.energy * 0.05);

          this.updateField(fieldId, field);
        }
        break;

      case 'continuant':
        // Stable field strengths with slight fluctuations
        for (const fieldId of fieldIds) {
          const field = this.activeFields.get(fieldId);
          if (!field) continue;

          // Small random fluctuations
          const fluctuation = (Math.random() * 2 - 1) * 0.02 * model.energy;
          field.strength = Math.min(1.0, Math.max(0.1, field.strength + fluctuation));

          this.updateField(fieldId, field);
        }
        break;

      case 'termination':
        // Decreasing field strengths
        for (const fieldId of fieldIds) {
          const field = this.activeFields.get(fieldId);
          if (!field) continue;

          // Gradually decrease strength
          field.strength = Math.max(0.1, field.strength - model.energy * 0.05);

          this.updateField(fieldId, field);
        }
        break;
    }
  }

  /**
   * Create a stochastic process for parameter evolution
   */
  createStochasticProcess(
    parameterId: string,
    processType: 'markov' | 'randomWalk' | 'granular' | 'gameTheory',
    config: any
  ): void {
    // Validate parameter exists
    if (!this.parameters.has(parameterId)) {
      console.error(`Parameter ${parameterId} not found`);
      return;
    }

    // Create process configuration
    const process = {
      type: processType,
      active: true,
      lastUpdate: performance.now(),
      updateInterval: config.updateInterval || 100, // ms
      config
    };

    // Store process
    this.stochasticProcesses.set(parameterId, process);

    // Initialize process
    this.initializeStochasticProcess(parameterId, process);

    this.emit('stochasticProcessCreated', { parameterId, processType });
  }

  /**
   * Initialize a stochastic process
   */
  private initializeStochasticProcess(parameterId: string, process: any): void {
    const parameter = this.parameters.get(parameterId);
    if (!parameter) return;

    switch (process.type) {
      case 'markov':
        if (this.audioEngine.setMarkovChain) {
          this.audioEngine.setMarkovChain(
            parameterId,
            process.config.states,
            process.config.transitionMatrix
          ).catch(console.error);
        }
        break;

      case 'randomWalk':
        if (this.audioEngine.setStochasticWalk) {
          this.audioEngine.setStochasticWalk(
            parameterId,
            process.config.stepSize,
            [parameter.min, parameter.max],
            process.config.tendency
          ).catch(console.error);
        }
        break;

      case 'granular':
        if (this.audioEngine.setGranularParameters) {
          this.audioEngine.setGranularParameters(
            parameterId,
            process.config.grainSize,
            process.config.density,
            process.config.randomization
          ).catch(console.error);
        }
        break;

      case 'gameTheory':
        if (this.audioEngine.setGameTheoryModel && Array.isArray(process.config.parameterIds)) {
          this.audioEngine.setGameTheoryModel(
            process.config.parameterIds,
            process.config.payoffMatrix,
            process.config.strategyWeights
          ).catch(console.error);
        }
        break;
    }
  }

  /**
   * Update all active stochastic processes
   */
  private updateStochasticProcesses(currentTime: number): void {
    for (const [parameterId, process] of this.stochasticProcesses.entries()) {
      if (!process.active) continue;

      // Check if it's time to update
      if (currentTime - process.lastUpdate >= process.updateInterval) {
        this.updateStochasticProcess(parameterId, process, currentTime);
        process.lastUpdate = currentTime;
      }
    }
  }

  /**
   * Update a specific stochastic process
   */
  private updateStochasticProcess(parameterId: string, process: any, currentTime: number): void {
    const parameter = this.parameters.get(parameterId);
    if (!parameter) return;

    switch (process.type) {
      case 'randomWalk':
        // Simple random walk implementation if engine doesn't support it
        if (!this.audioEngine.setStochasticWalk) {
          const currentValue = this.getParameterValues().get(parameterId) || parameter.default;
          const step = (Math.random() * 2 - 1) * process.config.stepSize;
          const tendency = (parameter.default - currentValue) * process.config.tendency;

          let newValue = currentValue + step + tendency;
          newValue = Math.max(parameter.min, Math.min(parameter.max, newValue));

          this.audioEngine.setParameter(parameterId, newValue).catch(console.error);
        }
        break;

      case 'granular':
        // Update granular parameters if they change over time
        if (process.config.timeVarying && this.audioEngine.setGranularParameters) {
          const time = currentTime / 1000; // Convert to seconds

          // Time-varying grain size
          const grainSize = process.config.grainSize *
            (1 + Math.sin(time * process.config.grainSizeRate) * process.config.grainSizeDepth);

          // Time-varying density
          const density = process.config.density *
            (1 + Math.sin(time * process.config.densityRate) * process.config.densityDepth);

          this.audioEngine.setGranularParameters(
            parameterId,
            grainSize,
            density,
            process.config.randomization
          ).catch(console.error);
        }
        break;
    }
  }

  /**
   * Stop a stochastic process
   */
  stopStochasticProcess(parameterId: string): void {
    const process = this.stochasticProcesses.get(parameterId);
    if (process) {
      process.active = false;
      this.emit('stochasticProcessStopped', { parameterId });
    }
  }

  /**
   * Resume a stochastic process
   */
  resumeStochasticProcess(parameterId: string): void {
    const process = this.stochasticProcesses.get(parameterId);
    if (process) {
      process.active = true;
      process.lastUpdate = performance.now();
      this.emit('stochasticProcessResumed', { parameterId });
    }
  }
}

export default AudioParameterBridge;
