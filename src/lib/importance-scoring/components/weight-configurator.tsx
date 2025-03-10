import React from 'react';
import { WeightConfiguratorProps } from '../types';
import { Slider } from '../../../components/ui/slider';
import { Label } from '../../../components/ui/label';

export const WeightConfigurator: React.FC<WeightConfiguratorProps> = ({
  weights,
  onWeightChange,
  mlWeight,
  onMLWeightChange,
}) => {
  const weightCategories = Object.entries(weights).map(([key, value]) => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    key,
    value,
  }));

  return (
    <div className="space-y-6 p-4 bg-background rounded-lg border">
      <h3 className="text-lg font-semibold">Weight Configuration</h3>
      
      {/* Traditional weights */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Traditional Scoring Weights</h4>
        {weightCategories.map(({ label, key, value }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between">
              <Label>{label}</Label>
              <span className="text-sm text-muted-foreground">
                {(value * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[value * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(newValue: number[]) => {
                onWeightChange(key as keyof typeof weights, newValue[0] / 100);
              }}
            />
          </div>
        ))}
      </div>

      {/* ML weight */}
      <div className="space-y-2 pt-4 border-t">
        <div className="flex justify-between">
          <Label>ML Model Influence</Label>
          <span className="text-sm text-muted-foreground">
            {(mlWeight * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          value={[mlWeight * 100]}
          min={10}
          max={90}
          step={1}
          onValueChange={(newValue: number[]) => onMLWeightChange(newValue[0] / 100)}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Balance between traditional scoring and ML predictions
        </p>
      </div>
    </div>
  );
};