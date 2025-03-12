import React from 'react';
import { AudioPattern } from '../../services/patterns/PatternLibrary';
import './PatternCard.css';

interface PatternCardProps {
  pattern: AudioPattern;
  onClick: () => void;
  onApply: () => void;
  onStar: (isStarred: boolean) => void;
}

export const PatternCard: React.FC<PatternCardProps> = ({
  pattern,
  onClick,
  onApply,
  onStar
}) => {
  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStar(!pattern.starred);
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApply();
  };

  // Format the date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="pattern-card" onClick={onClick}>
      <div className="card-thumbnail">
        <div className="waveform-preview">
          {pattern.waveform.map((value, index) => (
            <div
              key={index}
              className="waveform-bar"
              style={{ height: `${value * 100}%` }}
            />
          ))}
        </div>
        <div className={`pattern-category ${pattern.category}`}>
          {pattern.category}
        </div>
      </div>

      <div className="card-content">
        <div className="card-header">
          <h3 className="pattern-name">{pattern.name}</h3>
          <button
            className={`star-button ${pattern.starred ? 'starred' : ''}`}
            onClick={handleStarClick}
          >
            {pattern.starred ? '★' : '☆'}
          </button>
        </div>

        <p className="pattern-description">
          {pattern.description || 'No description provided'}
        </p>

        <div className="pattern-tags">
          {pattern.tags.map(tag => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="card-footer">
          <div className="pattern-info">
            <span className="pattern-date">Modified: {formatDate(pattern.modified)}</span>
            <span className="pattern-usage">Used: {pattern.usageCount} times</span>
          </div>

          <button className="apply-button" onClick={handleApplyClick}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
