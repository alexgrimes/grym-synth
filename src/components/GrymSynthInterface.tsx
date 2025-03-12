import React, { useState, useEffect, useRef } from 'react';
import { OrganicGravitationalInterface } from './visualization/OrganicGravitationalInterface';
import { ChatPanel } from './chat/ChatPanel';
import { MinimizedHeader } from './layout/MinimizedHeader';
import { ModeSwitcher, InterfaceMode } from './layout/ModeSwitcher';
import { AudioEngine } from '../services/audio/AudioEngine';
import './GrymSynthInterface.css';

export const GrymSynthInterface: React.FC = () => {
  // State for current mode
  const [currentMode, setCurrentMode] = useState<InterfaceMode>(InterfaceMode.CREATE);

  // State for audio engine and session
  const [audioEngine] = useState(() => new AudioEngine());
  const [sessionInfo, setSessionInfo] = useState({
    id: `session-${Date.now()}`,
    startTime: new Date(),
    parameters: {},
    memory: { used: 0, total: 0 },
  });

  // Refs for size management
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle resize events
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle mode changes
  const handleModeChange = (newMode: InterfaceMode) => {
    // Preserve current parameters before changing modes
    if (currentMode !== newMode) {
      // Save current state if needed
      setCurrentMode(newMode);
    }
  };

  // Handle parameter changes
  const handleParameterChange = (params: Record<string, number>) => {
    setSessionInfo(prev => ({
      ...prev,
      parameters: { ...prev.parameters, ...params }
    }));

    // Update audio engine
    Object.entries(params).forEach(([key, value]) => {
      audioEngine.setParameter(key, value);
    });
  };

  return (
    <div className="grym-synth-interface" ref={containerRef}>
      <MinimizedHeader
        sessionInfo={sessionInfo}
        mode={currentMode}
        onProjectSelect={(projectId) => console.log('Project selected:', projectId)}
      />

      <div className="main-content">
        <ModeSwitcher
          currentMode={currentMode}
          onModeChange={handleModeChange}
        />

        <div className="visualization-container">
          <OrganicGravitationalInterface
            width={dimensions.width}
            height={dimensions.height * 0.7} // 70% of container height
            audioEngine={audioEngine}
            mode={currentMode}
            onParameterChange={handleParameterChange}
          />
        </div>

        <div className="chat-container">
          <ChatPanel
            mode={currentMode}
            audioEngine={audioEngine}
            onParameterSuggestion={handleParameterChange}
          />
        </div>
      </div>
    </div>
  );
};
