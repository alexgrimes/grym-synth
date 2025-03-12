import React, { useRef, useEffect } from 'react';
import type { PerformanceMonitor } from './PerformanceMonitor';

interface PerformanceVisualizationProps {
  monitor: PerformanceMonitor;
  width?: number;
  height?: number;
  showGraph?: boolean;
  showStats?: boolean;
  refreshRate?: number;
}

export const PerformanceVisualization: React.FC<PerformanceVisualizationProps> = ({
  monitor,
  width = 300,
  height = 150,
  showGraph = true,
  showStats = true,
  refreshRate = 1000 / 60 // 60fps
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statsRef = useRef<HTMLPreElement>(null);
  const frameRequestRef = useRef<number>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!showGraph) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawMetrics = () => {
      const metrics = monitor.getAverageMetrics(60); // Last second of data
      if (!metrics.frameTime) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frame time threshold line (16.67ms for 60fps)
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.beginPath();
      const thresholdY = (16.67 / 33.33) * canvas.height; // Scale to 33.33ms max
      ctx.moveTo(0, canvas.height - thresholdY);
      ctx.lineTo(canvas.width, canvas.height - thresholdY);
      ctx.stroke();

      // Draw metrics
      const drawMetric = (value: number, color: string) => {
        const y = (value / 33.33) * canvas.height; // Scale to 33.33ms max
        ctx.fillStyle = color;
        ctx.fillRect(canvas.width - 1, canvas.height - y, 1, y);
      };

      // Shift previous data left
      ctx.drawImage(canvas, -1, 0);

      // Draw new data point
      if (metrics.frameTime) {
        drawMetric(metrics.frameTime, 'rgba(0, 255, 0, 0.5)');
      }
      if (metrics.updateTime) {
        drawMetric(metrics.updateTime, 'rgba(255, 255, 0, 0.5)');
      }
      if (metrics.physicsTime) {
        drawMetric(metrics.physicsTime, 'rgba(0, 255, 255, 0.5)');
      }
    };

    const updateStats = () => {
      if (!showStats || !statsRef.current) return;
      statsRef.current.textContent = monitor.getPerformanceReport();
    };

    const animate = () => {
      drawMetrics();
      updateStats();

      // Schedule next frame with throttling
      timeoutRef.current = setTimeout(() => {
        frameRequestRef.current = requestAnimationFrame(animate);
      }, refreshRate);
    };

    animate();

    return () => {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [monitor, showGraph, showStats, refreshRate]);

  return (
    <div className="performance-visualization">
      {showGraph && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            border: '1px solid #333',
            backgroundColor: '#1a1a1a'
          }}
        />
      )}
      {showStats && (
        <pre
          ref={statsRef}
          style={{
            margin: '8px 0',
            padding: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            fontSize: '12px',
            fontFamily: 'monospace',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap'
          }}
        />
      )}
      <style jsx>{`
        .performance-visualization {
          position: fixed;
          top: 8px;
          right: 8px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }

        canvas {
          image-rendering: pixelated;
        }

        pre {
          max-width: 300px;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
};

export default PerformanceVisualization;
