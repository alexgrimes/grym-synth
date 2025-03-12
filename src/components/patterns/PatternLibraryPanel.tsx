import React, { useState, useEffect, useRef } from 'react';
import { AudioPattern, PatternCategory, PatternLibrary, PatternFilter } from '../../services/patterns/PatternLibrary';
import { PatternCard } from './PatternCard';
import { PatternDetailsModal } from './PatternDetailsModal';
import './PatternLibraryPanel.css';

interface PatternLibraryPanelProps {
  isVisible: boolean;
  onPatternSelect: (pattern: AudioPattern) => void;
  onClose: () => void;
}

export const PatternLibraryPanel: React.FC<PatternLibraryPanelProps> = ({
  isVisible,
  onPatternSelect,
  onClose
}) => {
  const [patterns, setPatterns] = useState<AudioPattern[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<AudioPattern | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [filter, setFilter] = useState<PatternFilter>({
    sortBy: 'modified',
    sortDirection: 'desc'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PatternCategory | 'all'>('all');
  const [onlyStarred, setOnlyStarred] = useState(false);

  const libraryRef = useRef<PatternLibrary>(new PatternLibrary());

  // Load patterns on mount
  useEffect(() => {
    loadPatterns();
  }, []);

  // Reload patterns when filter changes
  useEffect(() => {
    if (isVisible) {
      loadPatterns();
    }
  }, [filter, isVisible]);

  const loadPatterns = async () => {
    const library = libraryRef.current;

    // Update filter with search query, category, and starred status
    const currentFilter: PatternFilter = {
      ...filter,
      searchQuery: searchQuery || undefined,
      categories: selectedCategory !== 'all' ? [selectedCategory as PatternCategory] : undefined,
      starred: onlyStarred ? true : undefined
    };

    // Get patterns with filter
    const loadedPatterns = library.getPatterns(currentFilter);
    setPatterns(loadedPatterns);

    // Get categories and tags
    setCategories(library.getCategories());
    setTags(library.getTags());
  };

  const handlePatternClick = (pattern: AudioPattern) => {
    setSelectedPattern(pattern);
    setIsDetailModalOpen(true);
  };

  const handleApplyPattern = (pattern: AudioPattern) => {
    // Increment usage count
    libraryRef.current.incrementUsage(pattern.id);

    // Call onPatternSelect
    onPatternSelect(pattern);

    // Close the panel
    onClose();
  };

  const handleStarPattern = async (pattern: AudioPattern, isStarred: boolean) => {
    const success = await libraryRef.current.starPattern(pattern.id, isStarred);
    if (success) {
      // Reload patterns to reflect changes
      loadPatterns();
    }
  };

  const handleDeletePattern = async (patternId: string) => {
    const success = await libraryRef.current.deletePattern(patternId);
    if (success) {
      // Close modal if the deleted pattern was selected
      if (selectedPattern?.id === patternId) {
        setIsDetailModalOpen(false);
        setSelectedPattern(null);
      }

      // Reload patterns to reflect changes
      loadPatterns();
    }
  };

  const handleCategoryChange = (category: PatternCategory | 'all') => {
    setSelectedCategory(category);
  };

  const handleSortChange = (sortBy: 'name' | 'created' | 'modified' | 'usageCount') => {
    setFilter(prev => ({
      ...prev,
      sortBy,
      sortDirection: prev.sortBy === sortBy && prev.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPatterns();
  };

  if (!isVisible) return null;

  return (
    <div className="pattern-library-panel">
      <div className="panel-header">
        <h2>Pattern Library</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="panel-filters">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search patterns..."
            className="search-input"
          />
          <button type="submit" className="search-button">
            Search
          </button>
        </form>

        <div className="filter-controls">
          <div className="category-filter">
            <span>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value as PatternCategory | 'all')}
              className="category-select"
            >
              <option value="all">All Categories</option>
              {(['stochastic', 'granular', 'spectral', 'textural', 'rhythmic', 'harmonic', 'atmospheric', 'custom'] as PatternCategory[]).map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="starred-filter">
            <label className="starred-label">
              <input
                type="checkbox"
                checked={onlyStarred}
                onChange={() => setOnlyStarred(!onlyStarred)}
                className="starred-checkbox"
              />
              <span>Starred Only</span>
            </label>
          </div>

          <div className="sort-control">
            <span>Sort by:</span>
            <button
              className={`sort-button ${filter.sortBy === 'name' ? 'active' : ''}`}
              onClick={() => handleSortChange('name')}
            >
              Name {filter.sortBy === 'name' && (filter.sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              className={`sort-button ${filter.sortBy === 'modified' ? 'active' : ''}`}
              onClick={() => handleSortChange('modified')}
            >
              Modified {filter.sortBy === 'modified' && (filter.sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              className={`sort-button ${filter.sortBy === 'usageCount' ? 'active' : ''}`}
              onClick={() => handleSortChange('usageCount')}
            >
              Usage {filter.sortBy === 'usageCount' && (filter.sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      <div className="patterns-grid">
        {patterns.length > 0 ? (
          patterns.map(pattern => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              onClick={() => handlePatternClick(pattern)}
              onApply={() => handleApplyPattern(pattern)}
              onStar={(isStarred) => handleStarPattern(pattern, isStarred)}
            />
          ))
        ) : (
          <div className="no-patterns-message">
            No patterns found. Analyze some audio to create patterns.
          </div>
        )}
      </div>

      {selectedPattern && (
        <PatternDetailsModal
          isOpen={isDetailModalOpen}
          pattern={selectedPattern}
          onClose={() => setIsDetailModalOpen(false)}
          onApply={() => handleApplyPattern(selectedPattern)}
          onDelete={() => handleDeletePattern(selectedPattern.id)}
          onStar={(isStarred) => handleStarPattern(selectedPattern, isStarred)}
        />
      )}
    </div>
  );
};
