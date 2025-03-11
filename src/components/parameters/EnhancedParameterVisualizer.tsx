import React, { useEffect, useState, useRef } from 'react';
import { getEnhancedRippleSystem } from '../../effects/EnhancedRippleSystem';
import './EnhancedParameterVisualizer.css';

interface ParameterData {
  id: string;
  name: string;
  value: number;
  category: string;
  description: string;
}

interface EnhancedParameterVisualizerProps {
  parameters: ParameterData[];
  highlightedParameters: string[];
  confidence: number;
  onParameterChange: (id: string, value: number) => void;
}

export const EnhancedParameterVisualizer: React.FC<EnhancedParameterVisualizerProps> = ({
  parameters,
  highlightedParameters,
  confidence,
  onParameterChange
}) => {
  const [activeParameter, setActiveParameter] = useState<string | null>(null);
  const [hoveredParameter, setHoveredParameter] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [previousValues, setPreviousValues] = useState<Record<string, number>>({});

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Effect to update parameter positions for ripple system
  useEffect(() => {
    if (!containerRef.current) return;

    const paramElements = containerRef.current.querySelectorAll('.parameter-bubble');
    const positions = Array.from(paramElements).map(elem => {
      const paramElem = elem as HTMLElement;
      const id = paramElem.dataset.id || '';
      const rect = paramElem.getBoundingClientRect();
      const containerRect = containerRef.current!.getBoundingClientRect();

      return {
        id,
        position: {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2
        },
        radius: rect.width / 2
      };
    });

    // Update ripple system positions
    const rippleSystem = getEnhancedRippleSystem();
    if (rippleSystem) {
      rippleSystem.updateParameterPositions(positions);
    }
  }, [parameters, containerRef.current?.offsetWidth, containerRef.current?.offsetHeight]);

  // Effect to create ripples when parameters change
  useEffect(() => {
    parameters.forEach(param => {
      const previousValue = previousValues[param.id];

      // Check if value changed
      if (previousValue !== undefined && previousValue !== param.value) {
        // Create ripple effect
        const rippleSystem = getEnhancedRippleSystem();
        if (rippleSystem) {
          rippleSystem.createParameterChangeRipple(param.id, param.value, previousValue);
        }
      }

      // Update previous values
      setPreviousValues(prev => ({
        ...prev,
        [param.id]: param.value
      }));
    });
  }, [parameters.map(p => p.value).join(',')]);

  // Effect to handle highlighted parameters
  useEffect(() => {
    if (highlightedParameters.length > 0) {
      setActiveParameter(highlightedParameters[0]);

      // Auto-clear after delay
      const timer = setTimeout(() => {
        setActiveParameter(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [highlightedParameters]);

  // Handle parameter click
  const handleParameterClick = (id: string) => {
    setActiveParameter(id === activeParameter ? null : id);
  };

  // Handle parameter hover
  const handleParameterHover = (
    id: string | null,
    e?: React.MouseEvent<HTMLDivElement>
  ) => {
    setHoveredParameter(id);

    if (id && e) {
      setTooltipPosition({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  // Handle parameter value change
  const handleValueChange = (id: string, value: number) => {
    onParameterChange(id, value);
  };

  // Get parameter style based on its properties
  const getParameterStyle = (param: ParameterData) => {
    // Base styles
    const baseStyle: React.CSSProperties = {
      transform: `scale(${0.6 + param.value * 0.8})`,
      transition: 'all 0.3s ease'
    };

    // Is highlighted or active
    const isActive = activeParameter === param.id;
    const isHighlighted = highlightedParameters.includes(param.id);

    // Add pulse animation for highlighted parameters
    if (isHighlighted) {
      baseStyle.animation = 'pulse 2s infinite';
    }

    // Add glow for active parameter
    if (isActive) {
      baseStyle.boxShadow = '0 0 20px rgba(100, 180, 255, 0.8)';
    }

    return baseStyle;
  };

  // Adjust parameter motion based on confidence
  const getMotionStyle = (param: ParameterData): React.CSSProperties => {
    // Higher confidence makes motion more directed
    if (confidence > 0.8) {
      return {
        animationDuration: '3s',
        animationTimingFunction: 'ease-in-out'
      };
    }

    // Medium confidence has moderate randomness
    else if (confidence > 0.5) {
      return {
        animationDuration: '4s',
        animationTimingFunction: 'ease-in-out'
      };
    }

    // Low confidence is more chaotic
    else {
      return {
        animationDuration: '2s',
        animationTimingFunction: 'cubic-bezier(0.3, 0.8, 0.7, 0.2)'
      };
    }
  };

  return (
    <div className="enhanced-parameter-visualizer" ref={containerRef}>
      {parameters.map((param) => (
        <div
          key={param.id}
          className={`parameter-bubble ${param.category} ${activeParameter === param.id ? 'active' : ''} ${highlightedParameters.includes(param.id) ? 'highlighted' : ''}`}
          style={{
            ...getParameterStyle(param),
            ...getMotionStyle(param)
          }}
          data-id={param.id}
          onClick={() => handleParameterClick(param.id)}
          onMouseEnter={(e) => handleParameterHover(param.id, e)}
          onMouseLeave={() => handleParameterHover(null)}
        >
          <div className="parameter-background"></div>
          <div className="parameter-value-indicator" style={{ height: `${param.value * 100}%` }}></div>
          <div className="parameter-name">{param.name}</div>
        </div>
      ))}

      {/* Parameter tooltip */}
      {hoveredParameter && (
        <div
          className="parameter-tooltip"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 70}px`
          }}
        >
          {parameters.find(p => p.id === hoveredParameter)?.description || ''}
        </div>
      )}

      {/* Parameter detail panel for active parameter */}
      {activeParameter && (
        <div className="parameter-detail-panel">
          <div className="detail-panel-header">
            <h3>{parameters.find(p => p.id === activeParameter)?.name}</h3>
            <button
              className="close-detail-button"
              onClick={() => setActiveParameter(null)}
            >
              ×
            </button>
          </div>

          <div className="detail-panel-content">
            <p className="parameter-description">
              {parameters.find(p => p.id === activeParameter)?.description}
            </p>

            <div className="parameter-value-control">
              <span>Value:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={parameters.find(p => p.id === activeParameter)?.value || 0}
                onChange={(e) => handleValueChange(
                  activeParameter,
                  parseFloat(e.target.value)
                )}
              />
              <span className="value-display">
                {(parameters.find(p => p.id === activeParameter)?.value || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
