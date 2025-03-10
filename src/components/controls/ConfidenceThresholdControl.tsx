import React from 'react';

interface ConfidenceThresholdControlProps {
  confidenceThreshold: number;
  onConfidenceThresholdChange: (value: number) => void;
  showLowConfidencePatterns: boolean;
  onShowLowConfidencePatternsChange: (show: boolean) => void;
}

interface ConfidenceLevel {
  value: number;
  label: string;
  color: string;
}

export const ConfidenceThresholdControl: React.FC<ConfidenceThresholdControlProps> = ({
  confidenceThreshold,
  onConfidenceThresholdChange,
  showLowConfidencePatterns,
  onShowLowConfidencePatternsChange
}) => {
  // Define confidence level presets
  const confidenceLevels: ConfidenceLevel[] = [
    { value: 0.9, label: 'Very High', color: 'rgb(46, 204, 113, 0.9)' },
    { value: 0.7, label: 'High', color: 'rgb(46, 204, 113, 0.7)' },
    { value: 0.5, label: 'Medium', color: 'rgb(46, 204, 113, 0.5)' },
    { value: 0.3, label: 'Low', color: 'rgb(46, 204, 113, 0.3)' },
    { value: 0.1, label: 'Very Low', color: 'rgb(46, 204, 113, 0.1)' }
  ];
  
  // Find current confidence level label
  const getCurrentConfidenceLabel = (): string => {
    const level = confidenceLevels.find(level => 
      confidenceThreshold >= level.value
    );
    return level?.label || 'Custom';
  };
  
  // Handle slider change
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    onConfidenceThresholdChange(newValue);
  };
  
  // Handle checkbox change
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onShowLowConfidencePatternsChange(event.target.checked);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Pattern Confidence Controls</h3>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}% 
          <span className="ml-2 text-gray-500">({getCurrentConfidenceLabel()})</span>
        </label>
        
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={confidenceThreshold}
          onChange={handleSliderChange}
          className="w-full"
        />
        
        <div className="flex justify-between mt-1">
          {confidenceLevels.map((level, index) => (
            <div
              key={index}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => onConfidenceThresholdChange(level.value)}
            >
              <div
                className="w-3 h-3 rounded-full mb-1"
                style={{ 
                  backgroundColor: level.color,
                  opacity: confidenceThreshold >= level.value ? 1 : 0.3
                }}
              />
              <span className="text-xs">{level.value * 100}%</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="showLowConfidence"
          checked={showLowConfidencePatterns}
          onChange={handleCheckboxChange}
          className="mr-2"
        />
        <label htmlFor="showLowConfidence" className="text-sm">
          Show low confidence patterns
        </label>
      </div>
      
      <div className="mt-4 border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Confidence Legend</h4>
        <div className="space-y-2">
          {confidenceLevels.map((level, index) => (
            <div key={index} className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ 
                  backgroundColor: level.color,
                  opacity: confidenceThreshold <= level.value ? 1 : 0.3
                }}
              />
              <span className="text-sm">
                {level.label} ({(level.value * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};