import React from 'react';
import { InterfaceMode } from '../layout/ModeSwitcher';
import { AudioEngine } from '../../services/audio/AudioEngine';

interface ChatPanelProps {
  mode: InterfaceMode;
  audioEngine: AudioEngine;
  onParameterSuggestion: (params: Record<string, number>) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  mode,
  audioEngine,
  onParameterSuggestion
}) => {
  // Placeholder implementation
  return (
    <div className="chat-panel">
      <div className="chat-history">
        {/* Chat messages will be implemented here */}
      </div>
      <div className="chat-input">
        {/* Chat input will be implemented here */}
      </div>
    </div>
  );
};
