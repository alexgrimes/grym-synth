import React, { useState } from 'react';
import { AudioPattern } from '../../services/patterns/PatternLibrary';
import './PatternDetailsModal.css';

interface PatternDetailsModalProps {
  isOpen: boolean;
  pattern: AudioPattern;
  onClose: () => void;
  onApply: () => void;
  onDelete: () => void;
  onStar: (isStarred: boolean) => void;
}

export const PatternDetailsModal: React.FC<PatternDetailsModalProps> = ({
  isOpen,
  pattern,
  onClose,
  onApply,
  onDelete,
  onStar
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'parameters' | 'analysis'>('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen) return null;

  // Format the date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleStarClick = () => {
    onStar(!pattern.starred);
  };

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="tab-content overview-tab">
            <div className="pattern-description-section">
              <h3>Description</h3>
              <p>{pattern.description || 'No description provided'}</p>
            </div>

            <div className="pattern-details-section">
              <div className="detail-item">
                <span className="detail-label">Created:</span>
                <span className="detail-value">{formatDate(pattern.created)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Modified:</span>
                <span className="detail-value">{formatDate(pattern.modified)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Category:</span>
                <span className="detail-value category-badge">{pattern.category}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Used:</span>
                <span className="detail-value">{pattern.usageCount} times</span>
              </div>
            </div>

            <div className="pattern-tags-section">
              <h3>Tags</h3>
              <div className="tags-container">
                {pattern.tags.length > 0 ? (
                  pattern.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="no-tags">No tags</span>
                )}
              </div>
            </div>
          </div>
        );

      case 'parameters':
        return (
          <div className="tab-content parameters-tab">
            <div className="parameters-list">
              {Object.entries(pattern.parameters).map(([key, value]) => (
                <div key={key} className="parameter-item">
                  <div className="parameter-label">
                    {key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </div>
                  <div className="parameter-value-container">
                    <div
                      className="parameter-value-bar"
                      style={{ width: `${value * 100}%` }}
                    />
                    <span className="parameter-value">{value.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'analysis':
        return (
          <div className="tab-content analysis-tab">
            <div className="analysis-section">
              <h3>Spectral Motion</h3>
              <div className="analysis-item">
                <span className="analysis-label">Type:</span>
                <span className="analysis-value">{pattern.spectralAnalysis.spectralMotion.type}</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Intensity:</span>
                <span className="analysis-value">
                  {pattern.spectralAnalysis.spectralMotion.intensity.toFixed(2)}
                </span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Rate:</span>
                <span className="analysis-value">
                  {pattern.spectralAnalysis.spectralMotion.rate.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="analysis-section">
              <h3>Spectral Typology</h3>
              <div className="analysis-item">
                <span className="analysis-label">Type:</span>
                <span className="analysis-value">{pattern.spectralAnalysis.spectralTypology.type}</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Position:</span>
                <span className="analysis-value">
                  {pattern.spectralAnalysis.spectralTypology.position.toFixed(2)}
                </span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Stability:</span>
                <span className="analysis-value">
                  {pattern.spectralAnalysis.spectralTypology.stability.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="analysis-section">
              <h3>Morphological Model</h3>
              <div className="analysis-item">
                <span className="analysis-label">Phase:</span>
                <span className="analysis-value">
                  {pattern.spectralAnalysis.morphologicalModel.phase}
                </span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Energy:</span>
                <span className="analysis-value">
                  {pattern.spectralAnalysis.morphologicalModel.energy.toFixed(2)}
                </span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Complexity:</span>
                <span className="analysis-value">
                  {pattern.spectralAnalysis.morphologicalModel.complexity.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="analysis-section">
              <h3>Temporal Gesture</h3>
              <div className="analysis-item">
                <span className="analysis-label">Streaming:</span>
                <span className="analysis-value">
                  {pattern.spectralAnalysis.temporalGesture.streaming.toFixed(2)}
                </span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Flocking:</span>
                <span className="analysis-value">
                  {pattern.spectralAnalysis.temporalGesture.flocking.toFixed(2)}
                </span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Turbulence:</span>
                <span className="analysis-value">
                  {pattern.spectralAnalysis.temporalGesture.turbulence.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pattern-details-modal">
      <div className="modal-overlay" onClick={onClose} />

      <div className="modal-content">
        <div className="modal-header">
          <div className="header-title">
            <h2>{pattern.name}</h2>
            <button
              className={`star-button ${pattern.starred ? 'starred' : ''}`}
              onClick={handleStarClick}
            >
              {pattern.starred ? '★' : '☆'}
            </button>
          </div>

          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="pattern-preview">
          <div className="waveform-container">
            {pattern.waveform.map((value, index) => (
              <div
                key={index}
                className="waveform-bar"
                style={{ height: `${value * 100}%` }}
              />
            ))}
          </div>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'parameters' ? 'active' : ''}`}
            onClick={() => setActiveTab('parameters')}
          >
            Parameters
          </button>
          <button
            className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Analysis
          </button>
        </div>

        {renderTabContent()}

        <div className="modal-footer">
          <div className="footer-left">
            <button
              className={`delete-button ${confirmDelete ? 'confirm' : ''}`}
              onClick={handleDeleteClick}
            >
              {confirmDelete ? 'Confirm Delete' : 'Delete'}
            </button>
          </div>

          <div className="footer-right">
            <button className="apply-button" onClick={onApply}>
              Apply Pattern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
