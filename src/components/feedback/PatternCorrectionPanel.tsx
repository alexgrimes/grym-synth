import React, { useState } from 'react';
import { AudioPattern } from '../../types/audio';

interface PatternCorrectionPanelProps {
  pattern: AudioPattern;
  onSaveCorrections: (updatedPattern: AudioPattern) => Promise<void>;
  onCancel: () => void;
  availablePatternTypes: string[];
}

export const PatternCorrectionPanel: React.FC<PatternCorrectionPanelProps> = ({
  pattern,
  onSaveCorrections,
  onCancel,
  availablePatternTypes
}) => {
  const [editedPattern, setEditedPattern] = useState<AudioPattern>({...pattern});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Helper to update pattern with changes
  const updatePattern = (changes: Partial<AudioPattern>) => {
    setEditedPattern(prev => ({
      ...prev,
      ...changes
    }));
  };
  
  // Time range handlers
  const handleStartTimeChange = (value: number) => {
    // Ensure start time doesn't exceed end time
    const startTime = Math.min(value, editedPattern.endTime - 0.01);
    updatePattern({ startTime });
  };
  
  const handleEndTimeChange = (value: number) => {
    // Ensure end time doesn't precede start time
    const endTime = Math.max(value, editedPattern.startTime + 0.01);
    updatePattern({ endTime });
  };
  
  // Frequency range handlers
  const handleLowFreqChange = (value: number) => {
    // Ensure low frequency doesn't exceed high frequency
    const low = Math.min(value, editedPattern.frequencyRange.high - 10);
    updatePattern({ 
      frequencyRange: {
        ...editedPattern.frequencyRange,
        low
      }
    });
  };
  
  const handleHighFreqChange = (value: number) => {
    // Ensure high frequency doesn't precede low frequency
    const high = Math.max(value, editedPattern.frequencyRange.low + 10);
    updatePattern({ 
      frequencyRange: {
        ...editedPattern.frequencyRange,
        high
      }
    });
  };
  
  // Type and confidence handlers
  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updatePattern({ type: event.target.value });
  };
  
  const handleConfidenceChange = (value: number) => {
    updatePattern({ confidence: value });
  };
  
  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    
    try {
      await onSaveCorrections(editedPattern);
    } catch (error) {
      setErrorMessage(`Failed to save corrections: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Reset handler
  const handleReset = () => {
    setEditedPattern({...pattern});
    setErrorMessage(null);
  };
  
  return (
    <div className="pattern-correction-panel bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Edit Pattern</h3>
      
      <div className="space-y-6">
        {/* Pattern Type Selection */}
        <div className="correction-section">
          <h4 className="text-sm font-medium mb-2">Pattern Type</h4>
          <select
            value={editedPattern.type}
            onChange={handleTypeChange}
            disabled={isSaving}
            className="w-full p-2 border rounded"
          >
            {availablePatternTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        {/* Time Range Controls */}
        <div className="correction-section">
          <h4 className="text-sm font-medium mb-2">Time Range</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">
                Start Time: {editedPattern.startTime.toFixed(2)}s
              </label>
              <input
                type="range"
                min={Math.max(0, pattern.startTime - 1)}
                max={pattern.endTime}
                step={0.01}
                value={editedPattern.startTime}
                onChange={(e) => handleStartTimeChange(parseFloat(e.target.value))}
                disabled={isSaving}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1">
                End Time: {editedPattern.endTime.toFixed(2)}s
              </label>
              <input
                type="range"
                min={pattern.startTime}
                max={pattern.endTime + 1}
                step={0.01}
                value={editedPattern.endTime}
                onChange={(e) => handleEndTimeChange(parseFloat(e.target.value))}
                disabled={isSaving}
                className="w-full"
              />
            </div>
          </div>
        </div>
        
        {/* Frequency Range Controls */}
        <div className="correction-section">
          <h4 className="text-sm font-medium mb-2">Frequency Range</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">
                Low Frequency: {editedPattern.frequencyRange.low.toFixed(0)}Hz
              </label>
              <input
                type="range"
                min={Math.max(20, pattern.frequencyRange.low / 2)}
                max={pattern.frequencyRange.high}
                step={10}
                value={editedPattern.frequencyRange.low}
                onChange={(e) => handleLowFreqChange(parseFloat(e.target.value))}
                disabled={isSaving}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1">
                High Frequency: {editedPattern.frequencyRange.high.toFixed(0)}Hz
              </label>
              <input
                type="range"
                min={pattern.frequencyRange.low}
                max={Math.min(20000, pattern.frequencyRange.high * 1.5)}
                step={10}
                value={editedPattern.frequencyRange.high}
                onChange={(e) => handleHighFreqChange(parseFloat(e.target.value))}
                disabled={isSaving}
                className="w-full"
              />
            </div>
          </div>
        </div>
        
        {/* Confidence Control */}
        <div className="correction-section">
          <h4 className="text-sm font-medium mb-2">
            Confidence: {(editedPattern.confidence * 100).toFixed(0)}%
          </h4>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={editedPattern.confidence}
            onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
            disabled={isSaving}
            className="w-full"
          />
        </div>
        
        {/* Error Message */}
        {errorMessage && (
          <div className="text-red-500 text-sm mt-2">
            {errorMessage}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Corrections'}
          </button>
          
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Reset
          </button>
          
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};