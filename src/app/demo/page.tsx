'use client';

import React, { useState, useEffect } from 'react';
import { GravitationalParameterInterface } from '../../components/physics/GravitationalParameterInterface';
import MockXenakisLDM from '../../components/physics/mocks/MockXenakisLDM';

export default function DemoPage() {
  const [audioEngine, setAudioEngine] = useState<MockXenakisLDM | null>(null);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [performanceWarnings, setPerformanceWarnings] = useState<string[]>([]);

  // Initialize audio engine
  useEffect(() => {
    const engine = new MockXenakisLDM();
    setAudioEngine(engine);

    // Clean up on unmount
    return () => {
      if (isAudioStarted) {
        engine.stopAudio().catch(console.error);
      }
    };
  }, [isAudioStarted]);

  // Handle performance warnings
  const handlePerformanceWarning = (warning: string) => {
    setPerformanceWarnings(prev => [...prev, warning]);

    // Remove warning after 5 seconds
    setTimeout(() => {
      setPerformanceWarnings(prev => prev.filter(w => w !== warning));
    }, 5000);
  };

  // Handle audio toggle
  const toggleAudio = async () => {
    if (!audioEngine) return;

    try {
      if (isAudioStarted) {
        await audioEngine.stopAudio();
        setIsAudioStarted(false);
      } else {
        await audioEngine.startAudio();
        setIsAudioStarted(true);
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };

  return (
    <div className="demo-page">
      <header className="demo-header">
        <h1>Grym-Synth: Gravitational Parameter Interface</h1>
        <p>
          A physics-based interface for controlling audio parameters inspired by Xenakis' stochastic music principles.
        </p>

        <div className="audio-controls">
          <button
            onClick={toggleAudio}
            className={`audio-toggle ${isAudioStarted ? 'active' : ''}`}
          >
            {isAudioStarted ? 'Stop Audio' : 'Start Audio'}
          </button>

          <div className="audio-status">
            Status: <span className={isAudioStarted ? 'active' : 'inactive'}>
              {isAudioStarted ? 'Running' : 'Stopped'}
            </span>
          </div>
        </div>
      </header>

      {performanceWarnings.length > 0 && (
        <div className="performance-warnings">
          <h3>Performance Warnings:</h3>
          <ul>
            {performanceWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <main className="demo-content">
        {audioEngine && (
          <GravitationalParameterInterface
            audioEngine={audioEngine}
            onPerformanceWarning={handlePerformanceWarning}
          />
        )}
      </main>

      <footer className="demo-footer">
        <p>
          Click on the visualization area to add gravitational fields.
          Fields influence audio parameters based on their position, strength, and radius.
        </p>
        <p>
          Use presets to explore different configurations or create your own.
        </p>
      </footer>

      <style jsx>{`
        .demo-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #121212;
          color: #f0f0f0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .demo-header {
          padding: 2rem;
          background: #1a1a2e;
          border-bottom: 1px solid #2a2a3a;
          text-align: center;
        }

        h1 {
          color: #4cc9f0;
          margin-bottom: 0.5rem;
        }

        .audio-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .audio-toggle {
          background: #4361ee;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .audio-toggle:hover {
          background: #3a56d4;
        }

        .audio-toggle.active {
          background: #ef476f;
        }

        .audio-toggle.active:hover {
          background: #d64161;
        }

        .audio-status {
          font-size: 0.9rem;
        }

        .audio-status .active {
          color: #06d6a0;
          font-weight: 600;
        }

        .audio-status .inactive {
          color: #ef476f;
          font-weight: 600;
        }

        .performance-warnings {
          background: rgba(239, 71, 111, 0.2);
          border-left: 4px solid #ef476f;
          padding: 1rem 2rem;
          margin: 1rem 2rem;
        }

        .performance-warnings h3 {
          color: #ef476f;
          margin-top: 0;
        }

        .performance-warnings ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .demo-content {
          flex: 1;
          padding: 2rem;
        }

        .demo-footer {
          padding: 1.5rem 2rem;
          background: #1a1a2e;
          border-top: 1px solid #2a2a3a;
          text-align: center;
          font-size: 0.9rem;
          color: #a0a0a0;
        }
      `}</style>
    </div>
  );
}
