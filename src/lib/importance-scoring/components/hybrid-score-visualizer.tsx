import React from 'react';
import { HybridScoreVisualizerProps } from '../types';

export const HybridScoreVisualizer: React.FC<HybridScoreVisualizerProps> = ({
  message,
  userScore,
  mlScore,
  confidence,
  weight,
}) => {
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const finalScore = (userScore * (1 - weight)) + (mlScore * weight);

  // Calculate bar widths
  const userScoreWidth = `${userScore * 100}%`;
  const mlScoreWidth = `${mlScore * 100}%`;
  const finalScoreWidth = `${finalScore * 100}%`;

  return (
    <div className="space-y-6 p-4 bg-background rounded-lg border">
      <h3 className="text-lg font-semibold">Importance Score Analysis</h3>

      {/* Message Preview */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Message</h4>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {message.content}
        </p>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>User-defined Score</span>
            <span>{formatPercent(userScore)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: userScoreWidth }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Weight: {formatPercent(1 - weight)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>ML Score</span>
            <span>{formatPercent(mlScore)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: mlScoreWidth }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Weight: {formatPercent(weight)}</span>
            <span>Confidence: {formatPercent(confidence)}</span>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm font-medium">
            <span>Final Score</span>
            <span>{formatPercent(finalScore)}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: finalScoreWidth }}
            />
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>ID: {message.id}</p>
        <p>Created: {message.timestamp.toLocaleString()}</p>
        {message.references && (
          <p>References: {message.references.length}</p>
        )}
      </div>
    </div>
  );
};