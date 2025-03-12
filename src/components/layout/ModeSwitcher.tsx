import React from 'react';
import './ModeSwitcher.css';

export enum InterfaceMode {
  ANALYZE = 'analyze',
  CREATE = 'create'
}

interface ModeSwitcherProps {
  currentMode: InterfaceMode;
  onModeChange: (mode: InterfaceMode) => void;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({
  currentMode,
  onModeChange
}) => {
  return (
    <div className="mode-switcher">
      <div className="mode-buttons">
        <button
          className={`mode-button ${currentMode === InterfaceMode.ANALYZE ? 'active' : ''}`}
          onClick={() => onModeChange(InterfaceMode.ANALYZE)}
        >
          <div className="button-icon analyze-icon"></div>
          <span>Analyze</span>
        </button>

        <button
          className={`mode-button ${currentMode === InterfaceMode.CREATE ? 'active' : ''}`}
          onClick={() => onModeChange(InterfaceMode.CREATE)}
        >
          <div className="button-icon create-icon"></div>
          <span>Create</span>
        </button>
      </div>

      <div className="mode-description">
        {currentMode === InterfaceMode.ANALYZE ? (
          <p>Analyze mode: Detect patterns and build your sound library</p>
        ) : (
          <p>Create mode: Generate and shape sounds with parameters</p>
        )}
      </div>
    </div>
  );
};
