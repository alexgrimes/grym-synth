import React, { useEffect, useRef, useState } from 'react';
import { getRippleSystem, initRippleSystem } from '../../effects/RippleSystem';
import './ParameterConnectionManager.css';

interface ParameterPosition {
  id: string;
  x: number;
  y: number;
  radius: number;
}

interface ParameterConnectionManagerProps {
  highlightedParameters: string[];
  chatPosition: { x: number; y: number };
  onRippleComplete?: () => void;
}

export const ParameterConnectionManager: React.FC<ParameterConnectionManagerProps> = ({
  highlightedParameters,
  chatPosition,
  onRippleComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [parameterPositions, setParameterPositions] = useState<ParameterPosition[]>([]);

  // Initialize ripple system
  useEffect(() => {
    if (canvasRef.current) {
      // Ensure canvas size matches container
      canvasRef.current.width = canvasRef.current.offsetWidth;
      canvasRef.current.height = canvasRef.current.offsetHeight;

      // Initialize ripple system
      initRippleSystem(canvasRef.current);
    }

    return () => {
      const system = getRippleSystem();
      if (system) {
        system.dispose();
      }
    };
  }, []);

  // Update parameter positions from visualization
  useEffect(() => {
    // This would be replaced with actual position data from visualization
    // For now, we'll use mock positions
    const mockPositions: ParameterPosition[] = [
      { id: 'stochastic-density', x: 200, y: 150, radius: 30 },
      { id: 'markov-transition', x: 350, y: 200, radius: 25 },
      { id: 'granular-cloud', x: 500, y: 150, radius: 35 },
      { id: 'spectral-filter', x: 650, y: 250, radius: 30 },
      { id: 'grain-density', x: 300, y: 300, radius: 25 },
      { id: 'grain-size', x: 450, y: 350, radius: 30 },
      { id: 'temporal-evolution', x: 600, y: 400, radius: 25 },
      { id: 'spectral-spread', x: 200, y: 400, radius: 30 }
    ];

    setParameterPositions(mockPositions);
  }, []);

  // Create ripples when highlighted parameters change
  useEffect(() => {
    if (highlightedParameters.length === 0) return;

    const rippleSystem = getRippleSystem();
    if (!rippleSystem) return;

    // Find positions of highlighted parameters
    const highlightedPositions = parameterPositions.filter(
      pos => highlightedParameters.includes(pos.id)
    );

    // Create ripples from chat to parameters
    highlightedPositions.forEach(pos => {
      rippleSystem.createRipple(
        chatPosition.x,
        chatPosition.y,
        pos.x,
        pos.y,
        {
          color: getParameterColor(pos.id),
          duration: 1200,
          maxRadius: pos.radius * 1.5
        }
      );
    });

    // Call onRippleComplete after all ripples are done
    const maxDuration = 1200 + (highlightedPositions.length * 150);
    setTimeout(() => {
      onRippleComplete?.();
    }, maxDuration);

  }, [highlightedParameters, chatPosition, parameterPositions, onRippleComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="parameter-connection-canvas"
    />
  );
};

// Helper function to get color based on parameter type
function getParameterColor(parameterId: string): string {
  if (parameterId.includes('stochastic')) {
    return 'rgba(100, 140, 255, 0.4)';
  } else if (parameterId.includes('markov')) {
    return 'rgba(140, 100, 255, 0.4)';
  } else if (parameterId.includes('granular') || parameterId.includes('grain')) {
    return 'rgba(100, 255, 200, 0.4)';
  } else if (parameterId.includes('spectral')) {
    return 'rgba(255, 180, 100, 0.4)';
  } else if (parameterId.includes('temporal')) {
    return 'rgba(100, 200, 255, 0.4)';
  } else {
    return 'rgba(150, 150, 255, 0.4)';
  }
}
