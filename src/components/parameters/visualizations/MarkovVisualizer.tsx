import React, { useEffect, useRef } from 'react';
import { MarkovParameter, MarkovState } from '../types/StochasticTypes';

interface MarkovVisualizerProps {
  parameter: MarkovParameter;
  width?: number;
  height?: number;
  showTransitions?: boolean;
}

export const MarkovVisualizer: React.FC<MarkovVisualizerProps> = ({
  parameter,
  width = 400,
  height = 400,
  showTransitions = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate grid dimensions
    const stateCount = parameter.states.length;
    const cellSize = Math.min(width, height) / (stateCount + 1);
    const margin = cellSize / 2;

    // Draw transition matrix heatmap
    drawTransitionMatrix(ctx, parameter, cellSize, margin);

    // Draw state labels
    drawStateLabels(ctx, parameter.states, cellSize, margin);

    // Draw current state highlight
    highlightCurrentState(ctx, parameter, cellSize, margin);

    // Draw transition arrows if enabled
    if (showTransitions) {
      drawTransitionArrows(ctx, parameter, cellSize, margin);
    }

  }, [parameter, width, height, showTransitions]);

  const drawTransitionMatrix = (
    ctx: CanvasRenderingContext2D,
    parameter: MarkovParameter,
    cellSize: number,
    margin: number
  ) => {
    const { states, transitionMatrix } = parameter;

    states.forEach((fromState, i) => {
      states.forEach((toState, j) => {
        const probability = transitionMatrix[i][j];
        const x = margin + j * cellSize;
        const y = margin + i * cellSize;

        // Draw cell background with intensity based on probability
        ctx.fillStyle = `rgba(0, 255, 0, ${probability})`;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw cell border
        ctx.strokeStyle = '#333';
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Draw probability value
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          probability.toFixed(2),
          x + cellSize / 2,
          y + cellSize / 2
        );
      });
    });
  };

  const drawStateLabels = (
    ctx: CanvasRenderingContext2D,
    states: MarkovState[],
    cellSize: number,
    margin: number
  ) => {
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Draw row labels (from states)
    states.forEach((state, i) => {
      const y = margin + i * cellSize + cellSize / 2;
      ctx.fillText(state.id, margin - 10, y);
    });

    // Draw column labels (to states)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    states.forEach((state, i) => {
      const x = margin + i * cellSize + cellSize / 2;
      ctx.fillText(state.id, x, margin - 10);
    });
  };

  const highlightCurrentState = (
    ctx: CanvasRenderingContext2D,
    parameter: MarkovParameter,
    cellSize: number,
    margin: number
  ) => {
    const currentStateIndex = parameter.states.findIndex(
      state => state.id === parameter.currentStateId
    );

    if (currentStateIndex === -1) return;

    // Highlight current state row
    const y = margin + currentStateIndex * cellSize;
    ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
    ctx.fillRect(margin, y, cellSize * parameter.states.length, cellSize);

    // Draw indicator triangle
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(margin - 20, y + cellSize / 2);
    ctx.lineTo(margin - 5, y + cellSize / 2 - 8);
    ctx.lineTo(margin - 5, y + cellSize / 2 + 8);
    ctx.closePath();
    ctx.fill();
  };

  const drawTransitionArrows = (
    ctx: CanvasRenderingContext2D,
    parameter: MarkovParameter,
    cellSize: number,
    margin: number
  ) => {
    const { states, transitionMatrix, currentStateId } = parameter;
    const currentStateIndex = states.findIndex(state => state.id === currentStateId);

    if (currentStateIndex === -1) return;

    // Draw arrows from current state to possible next states
    states.forEach((toState, j) => {
      const probability = transitionMatrix[currentStateIndex][j];
      if (probability > 0) {
        const fromX = margin + currentStateIndex * cellSize + cellSize / 2;
        const fromY = margin + currentStateIndex * cellSize + cellSize;
        const toX = margin + j * cellSize + cellSize / 2;
        const toY = margin + j * cellSize;

        // Draw arrow
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo(
          fromX,
          fromY + 20,
          toX,
          toY - 20,
          toX,
          toY
        );

        // Arrow styling based on probability
        ctx.strokeStyle = `rgba(0, 0, 255, ${probability})`;
        ctx.lineWidth = 2 * probability;
        ctx.stroke();

        // Draw arrow head
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
          toX - 10 * Math.cos(angle - Math.PI / 6),
          toY - 10 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          toX - 10 * Math.cos(angle + Math.PI / 6),
          toY - 10 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 0, 255, ${probability})`;
        ctx.fill();
      }
    });
  };

  return (
    <div style={{ width, height }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};
