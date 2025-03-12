import React, { useState } from 'react';
import { PatternCategory } from '../../services/patterns/PatternLibrary';
import './SavePatternModal.css';

interface SavePatternModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: {
    name: string;
    description: string;
    category: PatternCategory;
    tags: string[];
  }) => void;
  suggestedCategory: PatternCategory;
  suggestedTags: string[];
}

export const SavePatternModal: React.FC<SavePatternModalProps> = ({
  isOpen,
  onClose,
  onSave,
  suggestedCategory,
  suggestedTags
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PatternCategory>(suggestedCategory);
  const [tags, setTags] = useState<string[]>(suggestedTags);
  const [newTag, setNewTag] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!name.trim()) return;

    // Call onSave
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      tags: tags.filter(tag => tag.trim().length > 0)
    });
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    // Add tag if it doesn't already exist
    if (!tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }

    // Clear input
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="save-pattern-modal">
      <div className="modal-overlay" onClick={onClose} />

      <div className="modal-content">
        <div className="modal-header">
          <h2>Save Pattern</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form className="save-pattern-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="pattern-name">Name:</label>
            <input
              id="pattern-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter pattern name"
              required
              className="form-input"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="pattern-description">Description:</label>
            <textarea
              id="pattern-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter pattern description (optional)"
              className="form-textarea"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="pattern-category">Category:</label>
            <select
              id="pattern-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as PatternCategory)}
              className="form-select"
            >
              {(['stochastic', 'granular', 'spectral', 'textural', 'rhythmic', 'harmonic', 'atmospheric', 'custom'] as PatternCategory[]).map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="pattern-tags">Tags:</label>
            <div className="tags-input-container">
              <input
                id="pattern-tags"
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add tag and press Enter"
                className="form-input tag-input"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="add-tag-button"
                disabled={!newTag.trim()}
              >
                Add
              </button>
            </div>

            <div className="tags-container">
              {tags.map(tag => (
                <div key={tag} className="tag-item">
                  <span className="tag-name">{tag}</span>
                  <button
                    type="button"
                    className="remove-tag-button"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </button>
                </div>
              ))}

              {tags.length === 0 && (
                <span className="no-tags">No tags added</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="save-button"
              disabled={!name.trim()}
            >
              Save Pattern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
