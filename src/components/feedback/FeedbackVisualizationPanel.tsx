import React, { useState, useEffect, useRef } from 'react';
import { FeedbackState, FeedbackResult } from '../../lib/audio-generation/feedback/FeedbackController';
import { MathematicalStructure } from '../../lib/audio-generation/types';
import { XenakisLDMParams } from '../../lib/audio-generation/xenakisldm-client';
import './FeedbackVisualizationPanel.css';

interface FeedbackVisualizationPanelProps {
  feedbackState: FeedbackState;
  onAdjustmentApply?: (adjustments: Record<string, number>) => void;
  onFeedbackReset?: () => void;
  width?: number;
  height?: number;
  showControls?: boolean;
  latestResult?: FeedbackResult;
  currentStructure?: MathematicalStructure;
  originalParams?: XenakisLDMParams;
  currentParams?: XenakisLDMParams;
}

export const FeedbackVisualizationPanel: React.FC<FeedbackVisualizationPanelProps> = ({
  feedbackState,
  onAdjustmentApply,
  onFeedbackReset,
  width = 800,
  height = 500,
  showControls = true,
  latestResult,
  currentStructure,
  originalParams,
  currentParams
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'deviations' | 'parameters' | 'llm'>('overview');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, number>>({});

  // Prepare data for visualization
  useEffect(() => {
    if (!canvasRef.current || !feedbackState) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    drawVisualization(ctx, feedbackState);
  }, [feedbackState, activeTab]);

  // Draw the feedback visualization
  const drawVisualization = (ctx: CanvasRenderingContext2D, state: FeedbackState) => {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw based on active tab
    switch (activeTab) {
      case 'overview':
        drawOverview(ctx, state, canvasWidth, canvasHeight);
        break;
      case 'deviations':
        drawDeviations(ctx, state, canvasWidth, canvasHeight);
        break;
      case 'parameters':
        drawParameters(ctx, state, canvasWidth, canvasHeight);
        break;
      case 'llm':
        drawLLMInterventions(ctx, state, canvasWidth, canvasHeight);
        break;
    }
  };
  
  // Draw overall feedback status
  const drawOverview = (ctx: CanvasRenderingContext2D, state: FeedbackState, width: number, height: number) => {
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Title
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('Feedback System Overview', 20, 30);
    
    // Status info
    ctx.font = '14px Arial';
    ctx.fillText(`Status: ${state.currentStatus}`, 20, 60);
    ctx.fillText(`Iterations: ${state.iterations}`, 20, 85);
    
    // Draw iteration timeline
    const timelineY = 130;
    const timelineStartX = 50;
    const timelineEndX = width - 50;
    const timelineWidth = timelineEndX - timelineStartX;
    
    // Timeline base
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(timelineStartX, timelineY);
    ctx.lineTo(timelineEndX, timelineY);
    ctx.stroke();
    
    // Max iterations marker
    const maxIterations = 3; // Default value from FeedbackController
    
    // Draw iteration points
    for (let i = 0; i <= maxIterations; i++) {
      const x = timelineStartX + (i / maxIterations) * timelineWidth;
      
      // Point
      ctx.beginPath();
      ctx.arc(x, timelineY, 8, 0, Math.PI * 2);
      
      // Color based on completion
      if (i < state.iterations) {
        ctx.fillStyle = '#4CAF50'; // Completed iterations
      } else if (i === state.iterations && state.iterations > 0) {
        ctx.fillStyle = '#2196F3'; // Current iteration
      } else {
        ctx.fillStyle = '#ddd'; // Future iterations
      }
      
      ctx.fill();
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.fillText(`Iteration ${i}`, x - 25, timelineY + 25);
    }
    
    // Draw summary of deviations
    if (state.deviationHistory.length > 0) {
      const chartTop = 180;
      const chartHeight = 120;
      const chartBottom = chartTop + chartHeight;
      
      // Chart title
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#333';
      ctx.fillText('Deviation Trend', 20, chartTop - 10);
      
      // X and Y axes
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(timelineStartX, chartBottom);
      ctx.lineTo(timelineEndX, chartBottom);
      ctx.moveTo(timelineStartX, chartTop);
      ctx.lineTo(timelineStartX, chartBottom);
      ctx.stroke();
      
      // Plot average deviation for each iteration
      ctx.strokeStyle = '#E91E63';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      state.deviationHistory.forEach((deviations, iteration) => {
        const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
        const x = timelineStartX + (iteration / maxIterations) * timelineWidth;
        const y = chartBottom - (avgDeviation * chartHeight);
        
        if (iteration === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Point marker
        ctx.fillStyle = '#E91E63';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Value label
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.fillText(avgDeviation.toFixed(2), x + 5, y - 5);
      });
      
      ctx.stroke();
    }
    
    // Current status indicator
    const statusY = 350;
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('Current Status', 20, statusY - 10);
    
    // Status box
    let statusColor = '#ddd';
    switch (state.currentStatus) {
      case 'initial':
        statusColor = '#64B5F6'; // Light blue
        break;
      case 'in_progress':
        statusColor = '#FFB74D'; // Light orange
        break;
      case 'converged':
        statusColor = '#81C784'; // Light green
        break;
      case 'oscillating':
        statusColor = '#F06292'; // Light pink
        break;
      case 'terminated':
        statusColor = '#E57373'; // Light red
        break;
    }
    
    // Draw status indicator
    ctx.fillStyle = statusColor;
    ctx.fillRect(20, statusY, 200, 40);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(20, statusY, 200, 40);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(state.currentStatus.toUpperCase(), 40, statusY + 25);
    
    // If we have a latest result, show key metrics
    if (latestResult && latestResult.metrics) {
      const metricsY = 410;
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#333';
      ctx.fillText('Latest Metrics', 20, metricsY - 10);
      
      ctx.font = '12px Arial';
      ctx.fillText(`Convergence Score: ${latestResult.metrics.convergenceScore.toFixed(2)}`, 40, metricsY + 15);
      ctx.fillText(`Oscillation Detected: ${latestResult.metrics.oscillationDetected ? 'Yes' : 'No'}`, 40, metricsY + 35);
      ctx.fillText(`Iteration Count: ${latestResult.metrics.iterationCount}`, 40, metricsY + 55);
      ctx.fillText(`Deviation Magnitude: ${latestResult.metrics.deviationMagnitude.toFixed(2)}`, 40, metricsY + 75);
    }
  };
  
  // Draw deviation chart details
  const drawDeviations = (ctx: CanvasRenderingContext2D, state: FeedbackState, width: number, height: number) => {
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Title
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('Parameter Deviations', 20, 30);
    
    if (state.deviationHistory.length === 0) {
      ctx.font = '14px Arial';
      ctx.fillText('No deviation data available yet', 20, 60);
      return;
    }
    
    // Chart area
    const chartTop = 60;
    const chartHeight = height - chartTop - 40;
    const chartBottom = chartTop + chartHeight;
    const chartLeft = 80;
    const chartRight = width - 40;
    const chartWidth = chartRight - chartLeft;
    
    // X and Y axes
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartBottom);
    ctx.lineTo(chartRight, chartBottom);
    ctx.moveTo(chartLeft, chartTop);
    ctx.lineTo(chartLeft, chartBottom);
    ctx.stroke();
    
    // Axis labels
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText('Iterations', width / 2, chartBottom + 30);
    
    // Y-axis label - rotated
    ctx.save();
    ctx.translate(15, chartTop + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Deviation', 0, 0);
    ctx.restore();
    
    // Y-axis scale
    for (let i = 0; i <= 1; i += 0.2) {
      const y = chartBottom - i * chartHeight;
      
      // Grid line
      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartRight, y);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.fillText(i.toFixed(1), chartLeft - 25, y + 3);
    }
    
    // Find max iterations for x-axis scale
    const maxIterations = Math.max(3, state.deviationHistory.length); // At least 3
    
    // X-axis scale
    for (let i = 0; i <= maxIterations; i++) {
      const x = chartLeft + (i / maxIterations) * chartWidth;
      
      // Grid line
      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(x, chartTop);
      ctx.lineTo(x, chartBottom);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.fillText(i.toString(), x - 3, chartBottom + 15);
    }
    
    // Color palette for multiple deviation lines
    const colors = ['#E91E63', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#FF5722'];
    
    // Get the maximum number of deviation values in any iteration
    const maxDeviationCount = Math.max(...state.deviationHistory.map(d => d.length));
    
    // Plot each type of deviation as a separate line
    for (let deviationIndex = 0; deviationIndex < maxDeviationCount; deviationIndex++) {
      const color = colors[deviationIndex % colors.length];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      let started = false;
      
      state.deviationHistory.forEach((deviations, iteration) => {
        if (deviationIndex < deviations.length) {
          const deviation = deviations[deviationIndex];
          const x = chartLeft + (iteration / maxIterations) * chartWidth;
          const y = chartBottom - (deviation * chartHeight);
          
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
          
          // Point marker
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Value label
          ctx.fillStyle = '#333';
          ctx.font = '10px Arial';
          ctx.fillText(deviation.toFixed(2), x + 5, y - 5);
        }
      });
      
      ctx.stroke();
      
      // Add legend
      const legendY = 50 + deviationIndex * 20;
      ctx.fillStyle = color;
      ctx.fillRect(width - 150, legendY, 15, 15);
      
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.fillText(`Deviation ${deviationIndex + 1}`, width - 130, legendY + 12);
    }
  };
  
  // Draw parameter evolution chart
  const drawParameters = (ctx: CanvasRenderingContext2D, state: FeedbackState, width: number, height: number) => {
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Title
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('Parameter Evolution', 20, 30);
    
    if (state.parameterHistory.length === 0) {
      ctx.font = '14px Arial';
      ctx.fillText('No parameter history available yet', 20, 60);
      return;
    }
    
    // Chart area
    const chartTop = 60;
    const chartHeight = height - chartTop - 40;
    const chartBottom = chartTop + chartHeight;
    const chartLeft = 140; // Wider for parameter names
    const chartRight = width - 40;
    const chartWidth = chartRight - chartLeft;
    
    // X and Y axes
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartBottom);
    ctx.lineTo(chartRight, chartBottom);
    ctx.moveTo(chartLeft, chartTop);
    ctx.lineTo(chartLeft, chartBottom);
    ctx.stroke();
    
    // Axis labels
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText('Iterations', width / 2, chartBottom + 30);
    
    // Y-axis label - rotated
    ctx.save();
    ctx.translate(15, chartTop + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Parameter Value', 0, 0);
    ctx.restore();
    
    // Y-axis scale (0 to 1 for normalized parameters)
    for (let i = 0; i <= 1; i += 0.2) {
      const y = chartBottom - i * chartHeight;
      
      // Grid line
      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartRight, y);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.fillText(i.toFixed(1), chartLeft - 25, y + 3);
    }
    
    // Find max iterations for x-axis scale
    const maxIterations = Math.max(3, state.parameterHistory.length);
    
    // X-axis scale
    for (let i = 0; i <= maxIterations; i++) {
      const x = chartLeft + (i / maxIterations) * chartWidth;
      
      // Grid line
      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(x, chartTop);
      ctx.lineTo(x, chartBottom);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.fillText(i.toString(), x - 3, chartBottom + 15);
    }
    
    // Extract and collect parameter data
    const parameterData: Record<string, number[]> = {};
    
    state.parameterHistory.forEach(params => {
      // Flatten nested parameters for visualization
      const flatParams = flattenParams(params);
      
      // Collect values for each parameter
      for (const [param, value] of Object.entries(flatParams)) {
        if (typeof value === 'number') {
          if (!parameterData[param]) {
            parameterData[param] = [];
          }
          parameterData[param].push(value);
        }
      }
    });
    
    // Color palette for parameter lines
    const colors = ['#E91E63', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#FF5722', 
                   '#795548', '#607D8B', '#3F51B5', '#009688'];
    
    // Draw parameter evolution lines
    let paramIndex = 0;
    for (const [param, values] of Object.entries(parameterData)) {
      const color = colors[paramIndex % colors.length];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      values.forEach((value, iteration) => {
        const x = chartLeft + (iteration / maxIterations) * chartWidth;
        const y = chartBottom - (value * chartHeight);
        
        if (iteration === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Point marker
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.stroke();
      
      // Add legend
      const legendY = 50 + paramIndex * 20;
      ctx.fillStyle = color;
      ctx.fillRect(20, legendY, 15, 15);
      
      ctx.fillStyle = '#333';
      ctx.font = '11px Arial';
      ctx.fillText(param, 40, legendY + 12);
      
      paramIndex++;
      
      // Limit number of parameters shown to avoid clutter
      if (paramIndex >= 10) break;
    }
  };
  
  // Draw LLM intervention visualization
  const drawLLMInterventions = (ctx: CanvasRenderingContext2D, state: FeedbackState, width: number, height: number) => {
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Title
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('LLM Interventions', 20, 30);
    
    if (state.llmInterventions.length === 0) {
      ctx.font = '14px Arial';
      ctx.fillText('No LLM interventions recorded yet', 20, 60);
      return;
    }
    
    // Timeline visualization
    const timelineY = 100;
    const timelineStartX = 80;
    const timelineEndX = width - 40;
    const timelineWidth = timelineEndX - timelineStartX;
    
    // Timeline base
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(timelineStartX, timelineY);
    ctx.lineTo(timelineEndX, timelineY);
    ctx.stroke();
    
    // Max iterations marker
    const maxIterations = Math.max(3, Math.max(...state.llmInterventions.map(i => i.iteration)) + 1);
    
    // Draw iteration points
    for (let i = 0; i <= maxIterations; i++) {
      const x = timelineStartX + (i / maxIterations) * timelineWidth;
      
      // Point
      ctx.beginPath();
      ctx.arc(x, timelineY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ddd';
      ctx.fill();
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.fillText(`Iteration ${i}`, x - 25, timelineY + 25);
    }
    
    // Mark LLM interventions on timeline
    state.llmInterventions.forEach((intervention, index) => {
      const x = timelineStartX + (intervention.iteration / maxIterations) * timelineWidth;
      
      // Highlight intervention point
      ctx.beginPath();
      ctx.arc(x, timelineY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#9C27B0'; // Purple for LLM
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw connector to decision box
      const boxY = timelineY + 50 + index * 120;
      ctx.beginPath();
      ctx.moveTo(x, timelineY + 10);
      ctx.lineTo(x, boxY - 10);
      ctx.strokeStyle = '#9C27B0';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw decision box
      const boxWidth = 350;
      const boxHeight = 100;
      const boxX = Math.min(width - boxWidth - 20, Math.max(20, x - boxWidth / 2));
      
      ctx.fillStyle = '#F3E5F5'; // Light purple background
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.strokeStyle = '#9C27B0';
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      
      // Decision content
      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`LLM Decision at Iteration ${intervention.iteration}`, boxX + 10, boxY + 20);
      
      ctx.font = '12px Arial';
      ctx.fillText(`Action: ${intervention.decision.action}`, boxX + 10, boxY + 40);
      
      // Truncate reasoning to fit
      const reasoning = intervention.decision.reasoning || 'No reasoning provided';
      const maxLength = 80;
      const displayReasoning = reasoning.length > maxLength ? 
        reasoning.substring(0, maxLength) + '...' : reasoning;
      
      ctx.fillText(`Reasoning: ${displayReasoning}`, boxX + 10, boxY + 60);
      
      // Show timestamp
      const date = new Date(intervention.timestamp);
      ctx.font = '10px Arial';
      ctx.fillText(`Time: ${date.toLocaleTimeString()}`, boxX + 10, boxY + 80);
    });
  };
  
  // Helper function to flatten nested params for visualization
  const flattenParams = (params: any): Record<string, any> => {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'object' && value !== null) {
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          result[`${key}.${nestedKey}`] = nestedValue;
        }
      } else {
        result[key] = value;
      }
    }
    
    return result;
  };
  
  // Generate parameter adjustment controls
  const renderParamAdjustments = () => {
    if (!currentParams) return null;
    
    // Get flattened parameters for display
    const flatParams = flattenParams(currentParams);
    
    return (
      <div className="feedback-param-adjustments">
        <h3>Manual Parameter Adjustments</h3>
        
        {Object.entries(flatParams)
          .filter(([key, value]) => typeof value === 'number')
          .map(([key, value]) => (
            <div key={key} className="param-control">
              <label>{key}: {(manualAdjustments[key] !== undefined ? 
                (value as number) + manualAdjustments[key] : 
                value).toFixed(2)}</label>
              
              <input
                type="range"
                min={-0.25}
                max={0.25}
                step={0.01}
                value={manualAdjustments[key] || 0}
                onChange={e => {
                  const newAdjustments = { ...manualAdjustments };
                  newAdjustments[key] = parseFloat(e.target.value);
                  setManualAdjustments(newAdjustments);
                }}
              />
              
              <span className="adjustment-value">
                {manualAdjustments[key] ? 
                  (manualAdjustments[key] > 0 ? '+' : '') + manualAdjustments[key].toFixed(2) : 
                  '0.00'}
              </span>
            </div>
          ))}
        
        {Object.keys(manualAdjustments).length > 0 && (
          <div className="adjustment-actions">
            <button 
              onClick={() => onAdjustmentApply && onAdjustmentApply(manualAdjustments)}
              className="apply-btn"
            >
              Apply Adjustments
            </button>
            
            <button 
              onClick={() => setManualAdjustments({})}
              className="reset-btn"
            >
              Reset Adjustments
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // Navigation tabs
  const renderTabs = () => (
    <div className="feedback-tabs">
      <button 
        className={activeTab === 'overview' ? 'active' : ''}
        onClick={() => setActiveTab('overview')}
      >
        Overview
      </button>
      
      <button 
        className={activeTab === 'deviations' ? 'active' : ''}
        onClick={() => setActiveTab('deviations')}
      >
        Deviations
      </button>
      
      <button 
        className={activeTab === 'parameters' ? 'active' : ''}
        onClick={() => setActiveTab('parameters')}
      >
        Parameters
      </button>
      
      <button 
        className={activeTab === 'llm' ? 'active' : ''}
        onClick={() => setActiveTab('llm')}
      >
        LLM Decisions
      </button>
      
      {showControls && (
        <div className="feedback-controls">
          <label>
            <input 
              type="checkbox" 
              checked={isAutoRefresh} 
              onChange={(e) => setIsAutoRefresh(e.target.checked)} 
            />
            Auto Refresh
          </label>
          
          {onFeedbackReset && (
            <button 
              onClick={onFeedbackReset}
              className="reset-feedback-btn"
            >
              Reset Feedback
            </button>
          )}
        </div>
      )}
    </div>
  );
  
  return (
    <div className="feedback-visualization-panel" style={{ width, height }}>
      {renderTabs()}
      
      <div className="feedback-canvas-container">
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height - 150} 
          className="feedback-canvas"
        />
      </div>
      
      {activeTab === 'parameters' && showControls && renderParamAdjustments()}
      
      {currentStructure && (
        <div className="structure-type-indicator">
          Current structure: <strong>{currentStructure.type}</strong>
        </div>
      )}
    </div>
  );
};

export default FeedbackVisualizationPanel;