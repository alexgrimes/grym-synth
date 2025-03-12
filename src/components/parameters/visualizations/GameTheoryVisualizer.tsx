import React, { useEffect, useRef } from 'react';
import { GameTheoryParameter } from '../types/StochasticTypes';

interface GameTheoryVisualizerProps {
  parameter: GameTheoryParameter;
  width?: number;
  height?: number;
  showEquilibrium?: boolean;
}

export const GameTheoryVisualizer: React.FC<GameTheoryVisualizerProps> = ({
  parameter,
  width = 400,
  height = 400,
  showEquilibrium = true
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

    // Draw payoff matrix visualization
    drawPayoffMatrix(ctx, parameter);

    // Draw current strategies
    drawStrategies(ctx, parameter);

    // Draw equilibrium indicators if enabled
    if (showEquilibrium && parameter.currentOutcome.equilibrium) {
      drawEquilibriumIndicators(ctx, parameter);
    }

  }, [parameter, width, height, showEquilibrium]);

  const drawPayoffMatrix = (
    ctx: CanvasRenderingContext2D,
    parameter: GameTheoryParameter
  ) => {
    const { payoffMatrix, players } = parameter;
    const matrixSize = payoffMatrix.length;
    const cellSize = Math.min(width, height) / (matrixSize + 1);
    const margin = cellSize;

    // Draw matrix cells
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        const x = margin + j * cellSize;
        const y = margin + i * cellSize;
        const payoff = payoffMatrix[i][j];

        // Draw cell background
        const intensity = Math.max(0, Math.min(1, (payoff + 5) / 10)); // Normalize payoff to [0,1]
        ctx.fillStyle = `rgba(0, 128, 255, ${intensity})`;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw cell border
        ctx.strokeStyle = '#333';
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Draw payoff value
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          payoff.toFixed(2),
          x + cellSize / 2,
          y + cellSize / 2
        );
      }
    }

    // Draw strategy labels
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';

    // Player 1 strategies (rows)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < matrixSize; i++) {
      const y = margin + i * cellSize + cellSize / 2;
      ctx.fillText(`Strategy ${i + 1}`, margin - 10, y);
    }

    // Player 2 strategies (columns)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let j = 0; j < matrixSize; j++) {
      const x = margin + j * cellSize + cellSize / 2;
      ctx.fillText(`Strategy ${j + 1}`, x, margin - 10);
    }

    // Draw player labels
    ctx.font = 'bold 16px Arial';
    ctx.fillText(players[0].name, margin - 10, margin - 30);
    ctx.fillText(players[1].name, width - margin + 10, margin - 30);
  };

  const drawStrategies = (
    ctx: CanvasRenderingContext2D,
    parameter: GameTheoryParameter
  ) => {
    const { players } = parameter;
    const matrixSize = parameter.payoffMatrix.length;
    const cellSize = Math.min(width, height) / (matrixSize + 1);
    const margin = cellSize;

    // Draw strategy probability distributions
    players.forEach((player, playerIndex) => {
      const xBase = playerIndex === 0 ? 0 : width - 40;
      const yBase = margin;

      // Draw probability bars
      player.strategy.forEach((prob, i) => {
        const y = yBase + i * cellSize;
        const barWidth = 30;
        const barHeight = cellSize * 0.8;

        // Bar background
        ctx.fillStyle = '#eee';
        ctx.fillRect(xBase, y, barWidth, barHeight);

        // Probability fill
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.fillRect(xBase, y, barWidth * prob, barHeight);

        // Bar border
        ctx.strokeStyle = '#333';
        ctx.strokeRect(xBase, y, barWidth, barHeight);

        // Probability value
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          prob.toFixed(2),
          xBase + barWidth / 2,
          y + barHeight / 2
        );
      });
    });
  };

  const drawEquilibriumIndicators = (
    ctx: CanvasRenderingContext2D,
    parameter: GameTheoryParameter
  ) => {
    const matrixSize = parameter.payoffMatrix.length;
    const cellSize = Math.min(width, height) / (matrixSize + 1);
    const margin = cellSize;

    // Draw Nash equilibrium indicators
    parameter.currentOutcome.values.forEach((value, i) => {
      const x = margin + i * cellSize;
      const y = margin + i * cellSize;

      // Draw equilibrium marker
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        x + cellSize / 2,
        y + cellSize / 2,
        cellSize / 4,
        0,
        2 * Math.PI
      );
      ctx.stroke();

      // Draw star
      const starPoints = 5;
      const outerRadius = cellSize / 4;
      const innerRadius = outerRadius / 2;
      ctx.beginPath();
      for (let j = 0; j < starPoints * 2; j++) {
        const radius = j % 2 === 0 ? outerRadius : innerRadius;
        const angle = (j * Math.PI) / starPoints;
        const starX = x + cellSize / 2 + radius * Math.cos(angle);
        const starY = y + cellSize / 2 + radius * Math.sin(angle);
        if (j === 0) {
          ctx.moveTo(starX, starY);
        } else {
          ctx.lineTo(starX, starY);
        }
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fill();
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
