import React, { useEffect, useRef, useState } from 'react';
import {
  getEnhancedRippleSystem,
  initEnhancedRippleSystem
} from '../../effects/EnhancedRippleSystem';
import { LLMType } from '../../services/llm/LLMOrchestrator';
import './InteractiveConnectionVisualizer.css';

interface InteractiveConnectionVisualizerProps {
  chatPosition: { x: number, y: number };
  highlightedParameters: string[];
  llmType?: LLMType;
  confidence?: number;
}

export const InteractiveConnectionVisualizer: React.FC<InteractiveConnectionVisualizerProps> = ({
  chatPosition,
  highlightedParameters,
  llmType = 'reasoning',
  confidence = 0.8
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize ripple system
  useEffect(() => {
    if (canvasRef.current && !isInitialized) {
      initEnhancedRippleSystem(canvasRef.current);
      setIsInitialized(true);
    }

    return () => {
      const rippleSystem = getEnhancedRippleSystem();
      if (rippleSystem) {
        rippleSystem.dispose();
      }
    };
  }, []);

  // Create chat to parameter connections
  useEffect(() => {
    if (highlightedParameters.length > 0 && isInitialized) {
      const rippleSystem = getEnhancedRippleSystem();

      if (rippleSystem) {
        rippleSystem.createChatToParameterRipple(
          chatPosition,
          highlightedParameters,
          llmType,
          confidence
        );
      }
    }
  }, [highlightedParameters, chatPosition, llmType, confidence, isInitialized]);

  // Create confidence pulse effect
  useEffect(() => {
    if (isInitialized && confidence !== undefined && llmType) {
      const rippleSystem = getEnhancedRippleSystem();

      if (rippleSystem) {
        // Create pulse at center of visualization
        const canvas = canvasRef.current;
        if (canvas) {
          rippleSystem.createConfidencePulse(
            canvas.width / 2,
            canvas.height / 2,
            confidence,
            llmType
          );
        }
      }
    }
  }, [confidence, llmType, isInitialized]);

  return (
    <canvas
      ref={canvasRef}
      className="interactive-connection-canvas"
    />
  );
};
