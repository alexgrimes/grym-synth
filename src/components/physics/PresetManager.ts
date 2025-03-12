import { EventEmitter } from 'events';
import type { Vector3D } from '../parameters/types/StochasticTypes';

export interface PresetField {
  position: Vector3D;
  strength: number;
  radius: number;
  decay: number;
}

export interface PresetParameterState {
  id: string;
  position: Vector3D;
  value: number;
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  description?: string;
  fields: PresetField[];
  parameters: PresetParameterState[];
  tags: string[];
  metadata: {
    author: string;
    createdAt: string;
    modifiedAt: string;
    xenakisReference?: string;
    compositionContext?: string;
    importedFrom?: string;
  };
}

export interface PresetTransition {
  fromPreset: Preset;
  toPreset: Preset;
  duration: number;
  easing: 'linear' | 'exponential' | 'sinusoidal' | 'stochastic';
}

// Local storage keys
const STORAGE_KEYS = {
  PRESETS: 'grym-synth-presets',
  ACTIVE_PRESET: 'grym-synth-active-preset',
  CATEGORIES: 'grym-synth-categories'
};

export class PresetManager extends EventEmitter {
  private presets: Map<string, Preset>;
  private categories: Set<string>;
  private activePresetId: string | null;
  private transitionInProgress: boolean = false;

  constructor() {
    super();
    this.presets = new Map();
    this.categories = new Set();
    this.activePresetId = null;
    this.loadFromLocalStorage();

    // If no presets were loaded from local storage, initialize defaults
    if (this.presets.size === 0) {
      this.initializeDefaultPresets();
      this.saveToLocalStorage();
    }
  }

  /**
   * Save current state as a new preset
   */
  createPreset(
    name: string,
    category: string,
    fields: PresetField[],
    parameters: PresetParameterState[],
    metadata: Partial<Preset['metadata']> = {},
    tags: string[] = []
  ): Preset {
    const id = `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const preset: Preset = {
      id,
      name,
      category,
      fields,
      parameters,
      tags,
      metadata: {
        author: 'System',
        createdAt: now,
        modifiedAt: now,
        ...metadata
      }
    };

    this.presets.set(id, preset);
    this.categories.add(category);
    this.saveToLocalStorage();
    this.emit('presetCreated', preset);
    return preset;
  }

  /**
   * Load a preset by ID
   */
  loadPreset(id: string): Preset | null {
    const preset = this.presets.get(id);
    if (preset) {
      this.activePresetId = id;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PRESET, id);
      this.emit('presetLoaded', preset);
    }
    return preset || null;
  }

  /**
   * Get the currently active preset
   */
  getActivePreset(): Preset | null {
    return this.activePresetId ? this.presets.get(this.activePresetId) || null : null;
  }

  /**
   * Transition between two presets with morphing
   */
  async morphPresets(
    fromPresetId: string,
    toPresetId: string,
    duration: number = 2000,
    easing: PresetTransition['easing'] = 'sinusoidal',
    onProgress?: (progress: number, currentState: { fields: PresetField[]; parameters: PresetParameterState[] }) => void
  ): Promise<void> {
    const fromPreset = this.presets.get(fromPresetId);
    const toPreset = this.presets.get(toPresetId);

    if (!fromPreset || !toPreset) {
      throw new Error('One or both presets not found');
    }

    if (this.transitionInProgress) {
      throw new Error('A transition is already in progress');
    }

    this.transitionInProgress = true;
    this.emit('transitionStarted', { fromPreset, toPreset, duration });

    const transition: PresetTransition = {
      fromPreset,
      toPreset,
      duration,
      easing
    };

    const startTime = performance.now();

    return new Promise((resolve) => {
      const animate = () => {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);

        // Calculate intermediate state
        const currentState = this.interpolatePresets(transition, progress);

        // Call progress callback if provided
        if (onProgress) {
          onProgress(progress, currentState);
        }

        // Emit progress event
        this.emit('transitionProgress', {
          progress,
          currentState,
          fromPreset,
          toPreset
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Transition complete
          this.activePresetId = toPresetId;
          localStorage.setItem(STORAGE_KEYS.ACTIVE_PRESET, toPresetId);
          this.transitionInProgress = false;
          this.emit('transitionCompleted', toPreset);
          resolve();
        }
      };

      // Start animation
      requestAnimationFrame(animate);
    });
  }

  /**
   * Calculate intermediate state during preset transition
   */
  interpolatePresets(
    transition: PresetTransition,
    progress: number
  ): { fields: PresetField[]; parameters: PresetParameterState[] } {
    const easedProgress = this.applyEasing(progress, transition.easing);

    // Interpolate fields
    const fields = this.interpolateFields(
      transition.fromPreset.fields,
      transition.toPreset.fields,
      easedProgress
    );

    // Interpolate parameters
    const parameters = this.interpolateParameters(
      transition.fromPreset.parameters,
      transition.toPreset.parameters,
      easedProgress
    );

    return { fields, parameters };
  }

  /**
   * Apply easing function to transition progress
   */
  private applyEasing(progress: number, easing: PresetTransition['easing']): number {
    switch (easing) {
      case 'exponential':
        return progress * progress;
      case 'sinusoidal':
        return (1 - Math.cos(progress * Math.PI)) / 2;
      case 'stochastic':
        // Add some controlled randomness to the transition
        const noise = (Math.random() - 0.5) * 0.1; // ±5% noise
        return Math.max(0, Math.min(1, progress + noise * (1 - progress)));
      default:
        return progress; // linear
    }
  }

  /**
   * Interpolate between field states
   */
  private interpolateFields(
    fromFields: PresetField[],
    toFields: PresetField[],
    progress: number
  ): PresetField[] {
    // Match fields by closest position for interpolation
    return toFields.map(toField => {
      const closestFromField = this.findClosestField(toField, fromFields);
      return this.interpolateField(closestFromField || toField, toField, progress);
    });
  }

  /**
   * Find closest field by position
   */
  private findClosestField(target: PresetField, fields: PresetField[]): PresetField | null {
    if (fields.length === 0) return null;

    return fields.reduce((closest, field) => {
      const currentDistance = this.calculateDistance(target.position, field.position);
      const closestDistance = closest ?
        this.calculateDistance(target.position, closest.position) :
        Infinity;

      return currentDistance < closestDistance ? field : closest;
    });
  }

  /**
   * Interpolate between parameter states
   */
  private interpolateParameters(
    fromParams: PresetParameterState[],
    toParams: PresetParameterState[],
    progress: number
  ): PresetParameterState[] {
    const paramMap = new Map<string, PresetParameterState>();

    // Map all parameters by ID
    fromParams.forEach(param => paramMap.set(param.id, param));

    return toParams.map(toParam => {
      const fromParam = paramMap.get(toParam.id);
      if (!fromParam) return toParam;

      return {
        id: toParam.id,
        position: this.interpolateVector(fromParam.position, toParam.position, progress),
        value: fromParam.value + (toParam.value - fromParam.value) * progress
      };
    });
  }

  /**
   * Interpolate between field states
   */
  private interpolateField(
    fromField: PresetField,
    toField: PresetField,
    progress: number
  ): PresetField {
    return {
      position: this.interpolateVector(fromField.position, toField.position, progress),
      strength: fromField.strength + (toField.strength - fromField.strength) * progress,
      radius: fromField.radius + (toField.radius - fromField.radius) * progress,
      decay: fromField.decay + (toField.decay - fromField.decay) * progress
    };
  }

  /**
   * Interpolate between 3D vectors
   */
  private interpolateVector(from: Vector3D, to: Vector3D, progress: number): Vector3D {
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      z: from.z + (to.z - from.z) * progress
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(a: Vector3D, b: Vector3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get all presets in a category
   */
  getPresetsByCategory(category: string): Preset[] {
    return Array.from(this.presets.values())
      .filter(preset => preset.category === category);
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return Array.from(this.categories);
  }

  /**
   * Update an existing preset
   */
  updatePreset(id: string, updates: Partial<Omit<Preset, 'id'>>): Preset {
    const preset = this.presets.get(id);
    if (!preset) {
      throw new Error(`Preset with ID ${id} not found`);
    }

    const updatedPreset: Preset = {
      ...preset,
      ...updates,
      metadata: {
        ...preset.metadata,
        ...(updates.metadata || {}),
        modifiedAt: new Date().toISOString()
      }
    };

    this.presets.set(id, updatedPreset);

    if (updates.category && updates.category !== preset.category) {
      this.categories.add(updates.category);
    }

    this.saveToLocalStorage();
    this.emit('presetUpdated', updatedPreset);

    return updatedPreset;
  }

  /**
   * Delete a preset
   */
  deletePreset(id: string): boolean {
    const preset = this.presets.get(id);
    if (!preset) {
      return false;
    }

    const result = this.presets.delete(id);

    if (result) {
      // If the deleted preset was active, clear active preset
      if (this.activePresetId === id) {
        this.activePresetId = null;
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PRESET);
      }

      // Recalculate categories
      this.recalculateCategories();
      this.saveToLocalStorage();
      this.emit('presetDeleted', preset);
    }

    return result;
  }

  /**
   * Recalculate available categories based on existing presets
   */
  private recalculateCategories(): void {
    this.categories.clear();
    for (const preset of this.presets.values()) {
      this.categories.add(preset.category);
    }
  }

  /**
   * Save presets to local storage
   */
  private saveToLocalStorage(): void {
    try {
      // Save presets
      const presetsData = JSON.stringify(Array.from(this.presets.entries()));
      localStorage.setItem(STORAGE_KEYS.PRESETS, presetsData);

      // Save categories
      const categoriesData = JSON.stringify(Array.from(this.categories));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, categoriesData);

      // Save active preset
      if (this.activePresetId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PRESET, this.activePresetId);
      }
    } catch (error) {
      console.error('Error saving presets to local storage:', error);
    }
  }

  /**
   * Load presets from local storage
   */
  private loadFromLocalStorage(): void {
    try {
      // Load presets
      const presetsData = localStorage.getItem(STORAGE_KEYS.PRESETS);
      if (presetsData) {
        const entries = JSON.parse(presetsData) as [string, Preset][];
        this.presets = new Map(entries);
      }

      // Load categories
      const categoriesData = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (categoriesData) {
        const categories = JSON.parse(categoriesData) as string[];
        this.categories = new Set(categories);
      }

      // Load active preset
      const activePresetId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PRESET);
      if (activePresetId && this.presets.has(activePresetId)) {
        this.activePresetId = activePresetId;
      }
    } catch (error) {
      console.error('Error loading presets from local storage:', error);
      // If there's an error loading, initialize with defaults
      this.presets = new Map();
      this.categories = new Set();
      this.activePresetId = null;
    }
  }

  /**
   * Initialize default presets based on Xenakis compositions
   */
  private initializeDefaultPresets() {
    // 1. Metastasis (1953-54) - Glissandi-based preset
    this.createPreset(
      'Metastasis',
      'Stochastic',
      [
        {
          position: { x: 0.2, y: 0.3, z: 0.1 },
          strength: 0.8,
          radius: 0.6,
          decay: 0.92
        },
        {
          position: { x: 0.7, y: 0.5, z: 0.4 },
          strength: 0.6,
          radius: 0.4,
          decay: 0.85
        }
      ],
      [],
      {
        author: 'System',
        xenakisReference: 'Metastasis (1953-54)',
        compositionContext: 'Based on glissandi techniques and mathematical distributions'
      },
      ['glissandi', 'orchestral', 'mathematical']
    );

    // 2. Pithoprakta (1955-56) - Stochastic preset
    this.createPreset(
      'Pithoprakta',
      'Stochastic',
      [
        {
          position: { x: 0.1, y: 0.8, z: 0.3 },
          strength: 0.9,
          radius: 0.7,
          decay: 0.88
        },
        {
          position: { x: 0.5, y: 0.2, z: 0.6 },
          strength: 0.7,
          radius: 0.5,
          decay: 0.9
        },
        {
          position: { x: 0.8, y: 0.4, z: 0.2 },
          strength: 0.5,
          radius: 0.3,
          decay: 0.95
        }
      ],
      [],
      {
        author: 'System',
        xenakisReference: 'Pithoprakta (1955-56)',
        compositionContext: 'Based on kinetic gas theory and Brownian motion'
      },
      ['stochastic', 'brownian', 'kinetic']
    );

    // 3. Achorripsis (1956-57) - Poisson distribution preset
    this.createPreset(
      'Achorripsis',
      'Stochastic',
      [
        {
          position: { x: 0.3, y: 0.3, z: 0.7 },
          strength: 0.75,
          radius: 0.45,
          decay: 0.87
        }
      ],
      [],
      {
        author: 'System',
        xenakisReference: 'Achorripsis (1956-57)',
        compositionContext: 'Based on Poisson probability distribution'
      },
      ['poisson', 'probability', 'sparse']
    );

    // 4. Analogique A+B (1958-59) - Markov chains preset
    this.createPreset(
      'Analogique',
      'Harmonic',
      [
        {
          position: { x: 0.4, y: 0.6, z: 0.5 },
          strength: 0.65,
          radius: 0.55,
          decay: 0.91
        },
        {
          position: { x: 0.6, y: 0.3, z: 0.7 },
          strength: 0.55,
          radius: 0.65,
          decay: 0.89
        }
      ],
      [],
      {
        author: 'System',
        xenakisReference: 'Analogique A+B (1958-59)',
        compositionContext: 'Based on Markov chains and granular synthesis'
      },
      ['markov', 'granular', 'electronic']
    );

    // 5. Duel (1959) - Game theory preset
    this.createPreset(
      'Duel',
      'Textural',
      [
        {
          position: { x: 0.5, y: 0.5, z: 0.5 },
          strength: 0.7,
          radius: 0.6,
          decay: 0.85
        },
        {
          position: { x: 0.2, y: 0.7, z: 0.3 },
          strength: 0.8,
          radius: 0.4,
          decay: 0.9
        }
      ],
      [],
      {
        author: 'System',
        xenakisReference: 'Duel (1959)',
        compositionContext: 'Based on game theory and strategic interactions'
      },
      ['game-theory', 'interactive', 'strategic']
    );
  }

  /**
   * Export preset to file format
   */
  exportPreset(id: string): string {
    const preset = this.presets.get(id);
    if (!preset) throw new Error('Preset not found');
    return JSON.stringify(preset, null, 2);
  }

  /**
   * Import preset from file content
   */
  importPreset(content: string): Preset {
    try {
      const preset = JSON.parse(content) as Preset;

      // Validate preset structure
      if (!preset.id || !preset.name || !preset.category || !Array.isArray(preset.fields)) {
        throw new Error('Invalid preset format');
      }

      // Generate a new ID to avoid conflicts
      const originalId = preset.id;
      preset.id = `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update metadata
      preset.metadata = {
        ...preset.metadata,
        importedFrom: originalId,
        modifiedAt: new Date().toISOString()
      };

      this.presets.set(preset.id, preset);
      this.categories.add(preset.category);
      this.saveToLocalStorage();
      this.emit('presetImported', preset);

      return preset;
    } catch (error) {
      console.error('Error importing preset:', error);
      throw new Error(`Failed to import preset: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all presets
   */
  getAllPresets(): Preset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Search presets by name, category, or tags
   */
  searchPresets(query: string): Preset[] {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return this.getAllPresets();
    }

    return Array.from(this.presets.values()).filter(preset => {
      // Search in name
      if (preset.name.toLowerCase().includes(normalizedQuery)) {
        return true;
      }

      // Search in category
      if (preset.category.toLowerCase().includes(normalizedQuery)) {
        return true;
      }

      // Search in tags
      if (preset.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))) {
        return true;
      }

      // Search in description
      if (preset.description && preset.description.toLowerCase().includes(normalizedQuery)) {
        return true;
      }

      // Search in Xenakis reference
      if (preset.metadata.xenakisReference &&
          preset.metadata.xenakisReference.toLowerCase().includes(normalizedQuery)) {
        return true;
      }

      return false;
    });
  }
}

export default PresetManager;
