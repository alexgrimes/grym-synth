import React, { useEffect, useState } from 'react';
import { OrganicGravitationalInterface } from '../components/visualization/OrganicGravitationalInterface';
import { MockAudioEngine } from './MockAudioEngine';
import { PresetManager } from '../components/physics/PresetManager';

/**
 * Test component for demonstrating the OrganicGravitationalInterface
 */
const TestOrganicInterface: React.FC = () => {
  const [audioEngine, setAudioEngine] = useState<MockAudioEngine | null>(null);
  const [presetManager, setPresetManager] = useState<PresetManager | null>(null);
  const [initialPresetId, setInitialPresetId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize audio engine and presets
  useEffect(() => {
    try {
      // Create mock audio engine
      const engine = new MockAudioEngine();

      // Create preset manager
      const manager = new PresetManager();

      // Create some demo presets
      const preset1 = manager.createPreset(
        'Gentle Waves',
        'Ambient',
        [
          {
            position: { x: 0.3, y: 0.4, z: 0.5 },
            strength: 0.7,
            radius: 0.4,
            decay: 0.95
          },
          {
            position: { x: 0.6, y: 0.3, z: 0.5 },
            strength: 0.5,
            radius: 0.3,
            decay: 0.9
          }
        ],
        [],
        {
          author: 'Test',
          xenakisReference: 'Inspired by Formalized Music'
        }
      );

      const preset2 = manager.createPreset(
        'Chaotic Motion',
        'Experimental',
        [
          {
            position: { x: 0.2, y: 0.7, z: 0.5 },
            strength: 0.9,
            radius: 0.6,
            decay: 0.8
          },
          {
            position: { x: 0.8, y: 0.2, z: 0.5 },
            strength: 0.8,
            radius: 0.5,
            decay: 0.85
          },
          {
            position: { x: 0.5, y: 0.5, z: 0.5 },
            strength: 0.6,
            radius: 0.4,
            decay: 0.9
          }
        ],
        [],
        {
          author: 'Test',
          xenakisReference: 'Inspired by Xenakis stochastic techniques'
        }
      );

      const preset3 = manager.createPreset(
        'Harmonic Structure',
        'Tonal',
        [
          {
            position: { x: 0.25, y: 0.25, z: 0.5 },
            strength: 0.6,
            radius: 0.3,
            decay: 0.95
          },
          {
            position: { x: 0.5, y: 0.25, z: 0.5 },
            strength: 0.5,
            radius: 0.25,
            decay: 0.95
          },
          {
            position: { x: 0.75, y: 0.25, z: 0.5 },
            strength: 0.4,
            radius: 0.2,
            decay: 0.95
          },
          {
            position: { x: 0.25, y: 0.75, z: 0.5 },
            strength: 0.3,
            radius: 0.15,
            decay: 0.95
          },
          {
            position: { x: 0.5, y: 0.75, z: 0.5 },
            strength: 0.2,
            radius: 0.1,
            decay: 0.95
          }
        ],
        [],
        {
          author: 'Test',
          xenakisReference: 'Harmonic series exploration'
        }
      );

      // Start audio engine
      engine.startAudio().catch(console.error);

      // Set state
      setAudioEngine(engine);
      setPresetManager(manager);
      setInitialPresetId(preset1.id);
      setIsLoading(false);

    } catch (err) {
      console.error('Error initializing test:', err);
      setError(`Error initializing: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  }, []);

  // Handle performance warnings
  const handlePerformanceWarning = (warning: string) => {
    console.warn('Performance warning:', warning);
  };

  if (isLoading) {
    return <div className="loading">Loading test environment...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!audioEngine) {
    return <div className="error">Audio engine not initialized</div>;
  }

  return (
    <div className="test-container">
      <h1>Organic Gravitational Interface Test</h1>

      <p className="description">
        This is a test of the new organic visualization for the gravitational parameter interface.
        The interface uses Voronoi patterns for a more natural look and incorporates spectromorphology
        concepts for audio analysis.
      </p>

      <div className="interface-container">
        <OrganicGravitationalInterface
          audioEngine={audioEngine}
          onPerformanceWarning={handlePerformanceWarning}
          initialPresetId={initialPresetId}
          width={900}
          height={500}
        />
      </div>

      <div className="instructions">
        <h2>Instructions</h2>
        <ul>
          <li>Click on the visualization area to create new gravitational fields</li>
          <li>Adjust the EQ sliders in the center to modify frequency bands</li>
          <li>Try different presets from the preset list</li>
          <li>Save your own presets or morph between existing ones</li>
          <li>Observe the audio analysis and spectromorphology data</li>
        </ul>
      </div>

      <style jsx>{`
        .test-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
          color: #e0e0e0;
          background-color: #121220;
        }

        h1 {
          color: #4cc9f0;
          text-align: center;
          margin-bottom: 20px;
        }

        .description {
          margin-bottom: 30px;
          text-align: center;
          line-height: 1.5;
          color: #b0b0c0;
        }

        .interface-container {
          margin-bottom: 30px;
          padding: 20px;
          background-color: #1a1a2e;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .instructions {
          background-color: #1a1a2e;
          padding: 20px;
          border-radius: 10px;
          margin-top: 30px;
        }

        h2 {
          color: #4cc9f0;
          margin-top: 0;
        }

        ul {
          line-height: 1.6;
        }

        .loading, .error {
          padding: 50px;
          text-align: center;
          font-size: 18px;
        }

        .error {
          color: #ff6b6b;
        }
      `}</style>
    </div>
  );
};

export default TestOrganicInterface;
