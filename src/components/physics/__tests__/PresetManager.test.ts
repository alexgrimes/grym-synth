import { PresetManager, Preset, PresetField } from '../PresetManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => {
      return store[key] || null;
    }),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    length: 0,
    key: jest.fn((index: number) => ''),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('PresetManager', () => {
  let presetManager: PresetManager;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    presetManager = new PresetManager();
  });

  test('initializes with default presets when no presets in localStorage', () => {
    // Check that default presets were created
    const presets = presetManager.getAllPresets();
    expect(presets.length).toBeGreaterThan(0);

    // Check that localStorage was called to save the default presets
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  test('creates and saves a new preset', () => {
    const presetName = 'Test Preset';
    const presetCategory = 'Test Category';
    const fields: PresetField[] = [
      {
        position: { x: 0.1, y: 0.2, z: 0.3 },
        strength: 0.7,
        radius: 0.5,
        decay: 0.8
      }
    ];
    const parameters = [
      {
        id: 'param1',
        position: { x: 0.4, y: 0.5, z: 0.6 },
        value: 0.9
      }
    ];

    const preset = presetManager.createPreset(
      presetName,
      presetCategory,
      fields,
      parameters,
      { author: 'Test Author' },
      ['test', 'preset']
    );

    // Check that the preset was created with the correct properties
    expect(preset.name).toBe(presetName);
    expect(preset.category).toBe(presetCategory);
    expect(preset.fields).toEqual(fields);
    expect(preset.parameters).toEqual(parameters);
    expect(preset.metadata.author).toBe('Test Author');
    expect(preset.tags).toEqual(['test', 'preset']);

    // Check that localStorage was called to save the preset
    expect(localStorageMock.setItem).toHaveBeenCalled();

    // Check that the preset is in the list of all presets
    const allPresets = presetManager.getAllPresets();
    const foundPreset = allPresets.find(p => p.id === preset.id);
    expect(foundPreset).toBeDefined();
  });

  test('loads a preset by ID', () => {
    // Create a preset
    const preset = presetManager.createPreset(
      'Test Preset',
      'Test Category',
      [{ position: { x: 0.1, y: 0.2, z: 0.3 }, strength: 0.7, radius: 0.5, decay: 0.8 }],
      [{ id: 'param1', position: { x: 0.4, y: 0.5, z: 0.6 }, value: 0.9 }]
    );

    // Load the preset
    const loadedPreset = presetManager.loadPreset(preset.id);

    // Check that the loaded preset matches the created preset
    expect(loadedPreset).toEqual(preset);

    // Check that localStorage was called to save the active preset
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      expect.stringContaining('active-preset'),
      preset.id
    );
  });

  test('gets presets by category', () => {
    // Create presets in different categories
    const preset1 = presetManager.createPreset(
      'Preset 1',
      'Category A',
      [{ position: { x: 0.1, y: 0.2, z: 0.3 }, strength: 0.7, radius: 0.5, decay: 0.8 }],
      []
    );

    const preset2 = presetManager.createPreset(
      'Preset 2',
      'Category A',
      [{ position: { x: 0.4, y: 0.5, z: 0.6 }, strength: 0.6, radius: 0.4, decay: 0.7 }],
      []
    );

    const preset3 = presetManager.createPreset(
      'Preset 3',
      'Category B',
      [{ position: { x: 0.7, y: 0.8, z: 0.9 }, strength: 0.5, radius: 0.3, decay: 0.6 }],
      []
    );

    // Get presets by category
    const categoryAPresets = presetManager.getPresetsByCategory('Category A');
    const categoryBPresets = presetManager.getPresetsByCategory('Category B');

    // Check that the correct presets are returned for each category
    expect(categoryAPresets.length).toBe(2);
    expect(categoryAPresets.some(p => p.id === preset1.id)).toBe(true);
    expect(categoryAPresets.some(p => p.id === preset2.id)).toBe(true);

    expect(categoryBPresets.length).toBe(1);
    expect(categoryBPresets[0].id).toBe(preset3.id);
  });

  test('gets all available categories', () => {
    // Create presets in different categories
    presetManager.createPreset(
      'Preset 1',
      'Category A',
      [{ position: { x: 0.1, y: 0.2, z: 0.3 }, strength: 0.7, radius: 0.5, decay: 0.8 }],
      []
    );

    presetManager.createPreset(
      'Preset 2',
      'Category B',
      [{ position: { x: 0.4, y: 0.5, z: 0.6 }, strength: 0.6, radius: 0.4, decay: 0.7 }],
      []
    );

    // Get all categories
    const categories = presetManager.getCategories();

    // Check that all categories are returned
    expect(categories).toContain('Category A');
    expect(categories).toContain('Category B');
  });

  test('updates an existing preset', () => {
    // Create a preset
    const preset = presetManager.createPreset(
      'Original Name',
      'Original Category',
      [{ position: { x: 0.1, y: 0.2, z: 0.3 }, strength: 0.7, radius: 0.5, decay: 0.8 }],
      []
    );

    // Update the preset
    const updatedPreset = presetManager.updatePreset(preset.id, {
      name: 'Updated Name',
      category: 'Updated Category',
      fields: [{ position: { x: 0.4, y: 0.5, z: 0.6 }, strength: 0.6, radius: 0.4, decay: 0.7 }]
    });

    // Check that the preset was updated
    expect(updatedPreset.name).toBe('Updated Name');
    expect(updatedPreset.category).toBe('Updated Category');
    expect(updatedPreset.fields[0].position.x).toBe(0.4);

    // Check that localStorage was called to save the updated preset
    expect(localStorageMock.setItem).toHaveBeenCalled();

    // Check that the updated preset is in the list of all presets
    const allPresets = presetManager.getAllPresets();
    const foundPreset = allPresets.find(p => p.id === preset.id);
    expect(foundPreset).toEqual(updatedPreset);
  });

  test('deletes a preset', () => {
    // Create a preset
    const preset = presetManager.createPreset(
      'Test Preset',
      'Test Category',
      [{ position: { x: 0.1, y: 0.2, z: 0.3 }, strength: 0.7, radius: 0.5, decay: 0.8 }],
      []
    );

    // Delete the preset
    const result = presetManager.deletePreset(preset.id);

    // Check that the delete operation was successful
    expect(result).toBe(true);

    // Check that localStorage was called to save the updated presets
    expect(localStorageMock.setItem).toHaveBeenCalled();

    // Check that the preset is no longer in the list of all presets
    const allPresets = presetManager.getAllPresets();
    const foundPreset = allPresets.find(p => p.id === preset.id);
    expect(foundPreset).toBeUndefined();
  });

  test('searches presets by name, category, or tags', () => {
    // Create presets with different properties
    const preset1 = presetManager.createPreset(
      'Alpha Preset',
      'Category X',
      [{ position: { x: 0.1, y: 0.2, z: 0.3 }, strength: 0.7, radius: 0.5, decay: 0.8 }],
      [],
      {},
      ['alpha', 'test']
    );

    const preset2 = presetManager.createPreset(
      'Beta Preset',
      'Category Y',
      [{ position: { x: 0.4, y: 0.5, z: 0.6 }, strength: 0.6, radius: 0.4, decay: 0.7 }],
      [],
      {},
      ['beta', 'test']
    );

    const preset3 = presetManager.createPreset(
      'Gamma Preset',
      'Alpha Category',
      [{ position: { x: 0.7, y: 0.8, z: 0.9 }, strength: 0.5, radius: 0.3, decay: 0.6 }],
      [],
      {},
      ['gamma']
    );

    // Search by name
    const nameResults = presetManager.searchPresets('alpha');
    expect(nameResults.length).toBe(2); // Should find preset1 and preset3
    expect(nameResults.some(p => p.id === preset1.id)).toBe(true);
    expect(nameResults.some(p => p.id === preset3.id)).toBe(true);

    // Search by category
    const categoryResults = presetManager.searchPresets('category y');
    expect(categoryResults.length).toBe(1); // Should find preset2
    expect(categoryResults[0].id).toBe(preset2.id);

    // Search by tag
    const tagResults = presetManager.searchPresets('test');
    expect(tagResults.length).toBe(2); // Should find preset1 and preset2
    expect(tagResults.some(p => p.id === preset1.id)).toBe(true);
    expect(tagResults.some(p => p.id === preset2.id)).toBe(true);
  });

  test('exports and imports presets', () => {
    // Create a preset
    const originalPreset = presetManager.createPreset(
      'Export Test',
      'Export Category',
      [{ position: { x: 0.1, y: 0.2, z: 0.3 }, strength: 0.7, radius: 0.5, decay: 0.8 }],
      [{ id: 'param1', position: { x: 0.4, y: 0.5, z: 0.6 }, value: 0.9 }]
    );

    // Export the preset
    const exportedData = presetManager.exportPreset(originalPreset.id);

    // Import the preset
    const importedPreset = presetManager.importPreset(exportedData);

    // Check that the imported preset has the same properties as the original
    expect(importedPreset.name).toBe(originalPreset.name);
    expect(importedPreset.category).toBe(originalPreset.category);
    expect(importedPreset.fields).toEqual(originalPreset.fields);
    expect(importedPreset.parameters).toEqual(originalPreset.parameters);

    // Check that the imported preset has a different ID
    expect(importedPreset.id).not.toBe(originalPreset.id);

    // Check that the imported preset has the original ID in the importedFrom field
    expect(importedPreset.metadata.importedFrom).toBe(originalPreset.id);
  });

  test('morphs between presets with progress updates', async () => {
    // Create two presets
    const preset1 = presetManager.createPreset(
      'Preset 1',
      'Test Category',
      [{ position: { x: 0, y: 0, z: 0 }, strength: 0, radius: 0.2, decay: 0.5 }],
      [{ id: 'param1', position: { x: 0, y: 0, z: 0 }, value: 0 }]
    );

    const preset2 = presetManager.createPreset(
      'Preset 2',
      'Test Category',
      [{ position: { x: 1, y: 1, z: 1 }, strength: 1, radius: 0.8, decay: 1.0 }],
      [{ id: 'param1', position: { x: 1, y: 1, z: 1 }, value: 1 }]
    );

    // Set up a mock for the progress callback
    const progressCallback = jest.fn();

    // Start the morph with a short duration for testing
    const morphPromise = presetManager.morphPresets(
      preset1.id,
      preset2.id,
      100, // 100ms duration
      'linear',
      progressCallback
    );

    // Wait for the morph to complete
    await morphPromise;

    // Check that the progress callback was called multiple times
    expect(progressCallback).toHaveBeenCalled();
    expect(progressCallback.mock.calls.length).toBeGreaterThan(1);

    // Check that the last call had progress = 1 (complete)
    const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1];
    expect(lastCall[0]).toBe(1);

    // Check that the active preset is now preset2
    const activePreset = presetManager.getActivePreset();
    expect(activePreset?.id).toBe(preset2.id);
  });

  test('interpolates between presets correctly', () => {
    // Create test presets
    const fromPreset: Preset = {
      id: 'from',
      name: 'From Preset',
      category: 'Test',
      fields: [
        { position: { x: 0, y: 0, z: 0 }, strength: 0, radius: 0, decay: 0 }
      ],
      parameters: [
        { id: 'param1', position: { x: 0, y: 0, z: 0 }, value: 0 }
      ],
      tags: [],
      metadata: {
        author: 'Test',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      }
    };

    const toPreset: Preset = {
      id: 'to',
      name: 'To Preset',
      category: 'Test',
      fields: [
        { position: { x: 1, y: 1, z: 1 }, strength: 1, radius: 1, decay: 1 }
      ],
      parameters: [
        { id: 'param1', position: { x: 1, y: 1, z: 1 }, value: 1 }
      ],
      tags: [],
      metadata: {
        author: 'Test',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      }
    };

    // Test interpolation at 50%
    const halfwayResult = presetManager.interpolatePresets(
      { fromPreset, toPreset, duration: 1000, easing: 'linear' },
      0.5
    );

    // Check field interpolation
    expect(halfwayResult.fields[0].position.x).toBe(0.5);
    expect(halfwayResult.fields[0].position.y).toBe(0.5);
    expect(halfwayResult.fields[0].position.z).toBe(0.5);
    expect(halfwayResult.fields[0].strength).toBe(0.5);
    expect(halfwayResult.fields[0].radius).toBe(0.5);
    expect(halfwayResult.fields[0].decay).toBe(0.5);

    // Check parameter interpolation
    expect(halfwayResult.parameters[0].position.x).toBe(0.5);
    expect(halfwayResult.parameters[0].position.y).toBe(0.5);
    expect(halfwayResult.parameters[0].position.z).toBe(0.5);
    expect(halfwayResult.parameters[0].value).toBe(0.5);

    // Test different easing functions
    const easings: Array<'linear' | 'exponential' | 'sinusoidal' | 'stochastic'> = [
      'linear', 'exponential', 'sinusoidal', 'stochastic'
    ];

    for (const easing of easings) {
      const result = presetManager.interpolatePresets(
        { fromPreset, toPreset, duration: 1000, easing },
        0.5
      );

      // Just check that we get a result with the expected structure
      expect(result.fields.length).toBe(1);
      expect(result.parameters.length).toBe(1);
    }
  });
});
