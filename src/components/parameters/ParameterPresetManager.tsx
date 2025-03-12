import React, { useCallback, useState } from 'react';
import { ParameterPreset, ParameterTransition } from './types/StochasticTypes';

interface ParameterPresetManagerProps {
  presets: ParameterPreset[];
  currentPreset: ParameterPreset | null;
  onPresetLoad: (preset: ParameterPreset) => Promise<void>;
  onPresetSave: (preset: ParameterPreset) => Promise<void>;
  onTransition: (transition: ParameterTransition) => Promise<void>;
}

export const ParameterPresetManager: React.FC<ParameterPresetManagerProps> = ({
  presets,
  currentPreset,
  onPresetLoad,
  onPresetSave,
  onTransition
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    currentPreset?.id ?? null
  );
  const [transitionDuration, setTransitionDuration] = useState(1.0);
  const [interpolationType, setInterpolationType] = useState<'linear' | 'exponential' | 'stochastic'>('linear');

  // Group presets by category
  const presetsByCategory = presets.reduce((acc, preset) => {
    const category = preset.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(preset);
    return acc;
  }, {} as Record<string, ParameterPreset[]>);

  const handlePresetSelect = useCallback(async (presetId: string) => {
    const selectedPreset = presets.find(p => p.id === presetId);
    if (!selectedPreset) return;

    if (currentPreset && currentPreset.id !== presetId) {
      // Create and execute transition
      const transition: ParameterTransition = {
        fromPreset: currentPreset.id,
        toPreset: presetId,
        duration: transitionDuration,
        interpolationType
      };
      await onTransition(transition);
    }

    setSelectedPresetId(presetId);
    await onPresetLoad(selectedPreset);
  }, [currentPreset, transitionDuration, interpolationType, onPresetLoad, onTransition]);

  const handlePresetSave = useCallback(async () => {
    if (!currentPreset) return;

    const timestamp = new Date().toISOString();
    const updatedPreset: ParameterPreset = {
      ...currentPreset,
      metadata: {
        ...currentPreset.metadata,
        modifiedAt: timestamp
      }
    };

    await onPresetSave(updatedPreset);
  }, [currentPreset, onPresetSave]);

  return (
    <div className="parameter-preset-manager">
      <div className="transition-controls">
        <label>
          Transition Duration:
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={transitionDuration}
            onChange={e => setTransitionDuration(parseFloat(e.target.value))}
          />
          {transitionDuration.toFixed(1)}s
        </label>

        <label>
          Interpolation:
          <select
            value={interpolationType}
            onChange={e => setInterpolationType(e.target.value as any)}
          >
            <option value="linear">Linear</option>
            <option value="exponential">Exponential</option>
            <option value="stochastic">Stochastic</option>
          </select>
        </label>
      </div>

      <div className="preset-categories">
        {Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
          <div key={category} className="preset-category">
            <h3>{category}</h3>
            <div className="preset-list">
              {categoryPresets.map(preset => (
                <div
                  key={preset.id}
                  className={`preset-item ${selectedPresetId === preset.id ? 'selected' : ''}`}
                  onClick={() => handlePresetSelect(preset.id)}
                >
                  <div className="preset-info">
                    <h4>{preset.name}</h4>
                    {preset.description && (
                      <p className="preset-description">{preset.description}</p>
                    )}
                    <div className="preset-qualities">
                      {preset.perceptualQualities.map(quality => (
                        <span key={quality} className="quality-tag">
                          {quality}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="preset-metadata">
                    <span className="author">By {preset.metadata.author}</span>
                    <span className="modified">
                      Modified: {new Date(preset.metadata.modifiedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {preset.metadata.xenakisReferences && preset.metadata.xenakisReferences.length > 0 && (
                    <div className="xenakis-references">
                      <small>
                        Xenakis references: {preset.metadata.xenakisReferences.join(', ')}
                      </small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {currentPreset && (
        <div className="preset-actions">
          <button onClick={handlePresetSave}>
            Save Current State
          </button>
        </div>
      )}

      <style jsx>{`
        .parameter-preset-manager {
          padding: 1rem;
        }

        .transition-controls {
          margin-bottom: 1rem;
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .preset-categories {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .preset-category h3 {
          margin: 0 0 0.5rem 0;
          color: #666;
        }

        .preset-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .preset-item {
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .preset-item:hover {
          border-color: #666;
          background: #f9f9f9;
        }

        .preset-item.selected {
          border-color: #0066cc;
          background: #f0f7ff;
        }

        .preset-info h4 {
          margin: 0 0 0.5rem 0;
        }

        .preset-description {
          font-size: 0.9em;
          color: #666;
          margin: 0.5rem 0;
        }

        .preset-qualities {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin: 0.5rem 0;
        }

        .quality-tag {
          font-size: 0.8em;
          padding: 0.2rem 0.5rem;
          background: #eee;
          border-radius: 12px;
        }

        .preset-metadata {
          font-size: 0.8em;
          color: #666;
          margin-top: 0.5rem;
          display: flex;
          justify-content: space-between;
        }

        .xenakis-references {
          margin-top: 0.5rem;
          font-size: 0.8em;
          color: #666;
          font-style: italic;
        }

        .preset-actions {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #ddd;
        }
      `}</style>
    </div>
  );
};
