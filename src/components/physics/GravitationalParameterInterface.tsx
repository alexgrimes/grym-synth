import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PhysicsController } from './PhysicsController';
import { AudioParameterBridge, XenakisLDM } from './AudioParameterBridge';
import { PresetManager, Preset } from './PresetManager';
import type { Vector3D } from '../parameters/types/StochasticTypes';

interface GravitationalParameterInterfaceProps {
  audioEngine: XenakisLDM;
  onPerformanceWarning?: (warning: string) => void;
  initialPresetId?: string;
}

export const GravitationalParameterInterface: React.FC<GravitationalParameterInterfaceProps> = ({
  audioEngine,
  onPerformanceWarning,
  initialPresetId
}) => {
  // Refs for controllers
  const physicsControllerRef = useRef<PhysicsController | null>(null);
  const parameterBridgeRef = useRef<AudioParameterBridge | null>(null);
  const presetManagerRef = useRef<PresetManager | null>(null);

  // State for UI
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<Record<string, number>>({});
  const [audioAnalysis, setAudioAnalysis] = useState<Record<string, number>>({});

  // Canvas ref for visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize controllers
  useEffect(() => {
    // Create physics controller
    const physicsController = new PhysicsController({
      onParameterUpdate: async (updates) => {
        // This will be handled by the AudioParameterBridge
        return Promise.resolve();
      },
      onPerformanceWarning,
      performanceThresholds: {
        maxFrameTime: 16, // 60fps
        maxUpdateTime: 5,
        maxPhysicsTime: 8,
        maxRenderTime: 10
      }
    });

    // Create audio parameter bridge
    const parameterBridge = new AudioParameterBridge(physicsController, audioEngine);

    // Create preset manager
    const presetManager = new PresetManager();

    // Store refs
    physicsControllerRef.current = physicsController;
    parameterBridgeRef.current = parameterBridge;
    presetManagerRef.current = presetManager;

    // Load initial preset if provided
    if (initialPresetId) {
      const preset = presetManager.loadPreset(initialPresetId);
      if (preset) {
        physicsController.loadPreset(preset).catch(console.error);
        setActivePreset(preset);
      }
    }

    // Update UI state
    setPresets(presetManager.getAllPresets());
    setCategories(presetManager.getCategories());
    if (presetManager.getCategories().length > 0) {
      setSelectedCategory(presetManager.getCategories()[0]);
    }

    // Set up event listeners
    parameterBridge.on('audioAnalysisUpdated', (data) => {
      setAudioAnalysis(data);
    });

    // Clean up on unmount
    return () => {
      parameterBridge.stopSyncLoop();
    };
  }, [audioEngine, onPerformanceWarning, initialPresetId]);

  // Update canvas visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parameterBridge = parameterBridgeRef.current;
    if (!parameterBridge) return;

    // Animation frame handler
    const animate = () => {
      if (!canvas || !ctx || !parameterBridge) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get visualization data
      const visualizationData = parameterBridge.getVisualizationData();

      // Draw fields
      visualizationData.fields.forEach(field => {
        const x = field.position.x * canvas.width;
        const y = field.position.y * canvas.height;
        const radius = field.radius * Math.min(canvas.width, canvas.height) / 2;

        // Draw field circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(64, 196, 255, ${field.strength * 0.5})`;
        ctx.fill();

        // Draw field border
        ctx.strokeStyle = 'rgba(64, 196, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw affected parameters count
        if (field.affectedParameterCount > 0) {
          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`${field.affectedParameterCount}`, x, y);
        }
      });

      // Draw parameters
      visualizationData.parameters.forEach(param => {
        if (!param.position) return;

        const x = param.position.x * canvas.width;
        const y = param.position.y * canvas.height;

        // Draw parameter point
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 220, 64, 0.8)';
        ctx.fill();

        // Draw parameter label
        if (param.metadata?.name) {
          ctx.fillStyle = 'white';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(param.metadata.name, x, y - 10);
        }
      });

      // Request next frame
      requestAnimationFrame(animate);
    };

    // Start animation
    const animationId = requestAnimationFrame(animate);

    // Clean up
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Handle canvas click to add a field
  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const physicsController = physicsControllerRef.current;

    if (!canvas || !physicsController) return;

    // Get click position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    // Create a new field at the click position
    const fieldData = {
      position: { x, y, z: 0.5 },
      strength: 0.8,
      radius: 0.3,
      decay: 0.9
    };

    try {
      await physicsController.addField(fieldData);
    } catch (error) {
      console.error('Error adding field:', error);
    }
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback(async (presetId: string) => {
    const presetManager = presetManagerRef.current;
    const physicsController = physicsControllerRef.current;

    if (!presetManager || !physicsController) return;

    const preset = presetManager.loadPreset(presetId);
    if (preset) {
      try {
        await physicsController.loadPreset(preset);
        setActivePreset(preset);
      } catch (error) {
        console.error('Error loading preset:', error);
      }
    }
  }, []);

  // Handle preset morphing
  const handleMorphPresets = useCallback(async (fromPresetId: string, toPresetId: string, duration: number = 2000) => {
    const presetManager = presetManagerRef.current;
    const physicsController = physicsControllerRef.current;

    if (!presetManager || !physicsController) return;

    const fromPreset = presetManager.loadPreset(fromPresetId);
    const toPreset = presetManager.loadPreset(toPresetId);

    if (!fromPreset || !toPreset) return;

    setIsTransitioning(true);
    setTransitionProgress(0);

    try {
      await presetManager.morphPresets(
        fromPresetId,
        toPresetId,
        duration,
        'sinusoidal',
        (progress, currentState) => {
          setTransitionProgress(progress);

          // Apply the current state to the physics controller
          physicsController.clearFields();

          // Add interpolated fields
          for (const field of currentState.fields) {
            physicsController.addField(field).catch(console.error);
          }
        }
      );

      setActivePreset(toPreset);
    } catch (error) {
      console.error('Error morphing presets:', error);
    } finally {
      setIsTransitioning(false);
      setTransitionProgress(0);
    }
  }, []);

  // Handle saving a new preset
  const handleSavePreset = useCallback((name: string, category: string) => {
    const presetManager = presetManagerRef.current;
    const physicsController = physicsControllerRef.current;
    const parameterBridge = parameterBridgeRef.current;

    if (!presetManager || !physicsController || !parameterBridge) return;

    // Get current fields from visualization data
    const visualizationData = parameterBridge.getVisualizationData();
    const fields = visualizationData.fields.map(field => ({
      position: field.position,
      strength: field.strength,
      radius: field.radius,
      decay: 0.9 // Default decay value
    }));

    // Get current parameter values
    const parameterValues = parameterBridge.getParameterValues();
    const parameters = Array.from(parameterValues.entries()).map(([id, value]) => {
      const param = visualizationData.parameters.find(p => p.id === id);
      return {
        id,
        position: param?.position || { x: 0.5, y: 0.5, z: 0.5 },
        value
      };
    });

    // Create the preset
    const preset = presetManager.createPreset(
      name,
      category,
      fields,
      parameters,
      {
        author: 'User',
        xenakisReference: 'Custom Preset'
      }
    );

    // Update UI state
    setPresets(presetManager.getAllPresets());
    setCategories(presetManager.getCategories());
    setActivePreset(preset);

    return preset;
  }, []);

  // Render the component
  return (
    <div className="gravitational-parameter-interface">
      <div className="visualization-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          onClick={handleCanvasClick}
          className="parameter-canvas"
          style={{ backgroundColor: '#1a1a2e', borderRadius: '8px' }}
        />

        {isTransitioning && (
          <div className="transition-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${transitionProgress * 100}%` }}
              />
            </div>
            <div className="progress-text">
              Morphing: {Math.round(transitionProgress * 100)}%
            </div>
          </div>
        )}
      </div>

      <div className="controls-container">
        <div className="preset-controls">
          <h3>Presets</h3>

          <div className="category-selector">
            <label>Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="preset-list">
            {presets
              .filter(preset => preset.category === selectedCategory)
              .map(preset => (
                <div
                  key={preset.id}
                  className={`preset-item ${activePreset?.id === preset.id ? 'active' : ''}`}
                  onClick={() => handlePresetSelect(preset.id)}
                >
                  <div className="preset-name">{preset.name}</div>
                  <div className="preset-description">
                    {preset.description || preset.metadata.xenakisReference || ''}
                  </div>
                </div>
              ))}
          </div>

          <div className="preset-actions">
            <button
              onClick={() => {
                const name = prompt('Enter preset name:');
                const category = prompt('Enter preset category:', selectedCategory);
                if (name && category) {
                  handleSavePreset(name, category);
                }
              }}
            >
              Save Current
            </button>

            {activePreset && (
              <button
                onClick={() => {
                  const targetPresetId = prompt('Enter target preset ID:');
                  if (targetPresetId) {
                    handleMorphPresets(activePreset.id, targetPresetId);
                  }
                }}
              >
                Morph To...
              </button>
            )}
          </div>
        </div>

        <div className="analysis-display">
          <h3>Audio Analysis</h3>
          <div className="analysis-metrics">
            {Object.entries(audioAnalysis).map(([key, value]) => (
              <div key={key} className="metric">
                <div className="metric-name">{key}:</div>
                <div className="metric-value">{value.toFixed(2)}</div>
                <div className="metric-bar">
                  <div
                    className="metric-fill"
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .gravitational-parameter-interface {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .visualization-container {
          position: relative;
        }

        .parameter-canvas {
          width: 100%;
          height: auto;
          cursor: pointer;
        }

        .transition-progress {
          position: absolute;
          bottom: 10px;
          left: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          padding: 10px;
          border-radius: 4px;
        }

        .progress-bar {
          height: 10px;
          background: #333;
          border-radius: 5px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(to right, #4cc9f0, #4361ee);
          transition: width 0.1s ease-out;
        }

        .progress-text {
          text-align: center;
          margin-top: 5px;
          color: white;
          font-size: 12px;
        }

        .controls-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .preset-controls, .analysis-display {
          background: #2a2a3a;
          border-radius: 8px;
          padding: 15px;
        }

        h3 {
          margin-top: 0;
          color: #4cc9f0;
          border-bottom: 1px solid #4361ee;
          padding-bottom: 8px;
        }

        .category-selector {
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        select {
          background: #1a1a2e;
          color: white;
          border: 1px solid #4361ee;
          padding: 5px 10px;
          border-radius: 4px;
        }

        .preset-list {
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 15px;
        }

        .preset-item {
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 5px;
          cursor: pointer;
          background: #1a1a2e;
          transition: background 0.2s;
        }

        .preset-item:hover {
          background: #252547;
        }

        .preset-item.active {
          background: #4361ee;
        }

        .preset-name {
          font-weight: bold;
          margin-bottom: 3px;
        }

        .preset-description {
          font-size: 12px;
          opacity: 0.8;
        }

        .preset-actions {
          display: flex;
          gap: 10px;
        }

        button {
          background: #4361ee;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }

        button:hover {
          background: #3a56d4;
        }

        .analysis-metrics {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .metric {
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-rows: auto auto;
          gap: 5px;
        }

        .metric-name {
          font-size: 12px;
          color: #4cc9f0;
        }

        .metric-value {
          font-size: 12px;
          text-align: right;
        }

        .metric-bar {
          grid-column: 1 / -1;
          height: 6px;
          background: #1a1a2e;
          border-radius: 3px;
          overflow: hidden;
        }

        .metric-fill {
          height: 100%;
          background: linear-gradient(to right, #4cc9f0, #4361ee);
          transition: width 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default GravitationalParameterInterface;
