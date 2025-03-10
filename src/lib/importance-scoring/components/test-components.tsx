import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeightConfigurator } from './weight-configurator';
import { MLInsightsPanel } from './ml-insights-panel';
import { HybridScoreVisualizer } from './hybrid-score-visualizer';

describe('WeightConfigurator', () => {
  const mockWeights = {
    recency: 0.2,
    relevance: 0.2,
    interaction: 0.2,
    complexity: 0.1,
    theme: 0.2,
    keyTerms: 0.1,
  };

  const mockProps = {
    weights: mockWeights,
    onWeightChange: jest.fn(),
    mlWeight: 0.3,
    onMLWeightChange: jest.fn(),
  };

  it('renders all weight categories', () => {
    render(<WeightConfigurator {...mockProps} />);
    
    Object.keys(mockWeights).forEach(key => {
      expect(screen.getByText(key.charAt(0).toUpperCase() + key.slice(1))).toBeInTheDocument();
    });
  });

  it('displays current weight values', () => {
    render(<WeightConfigurator {...mockProps} />);
    
    Object.values(mockWeights).forEach(value => {
      expect(screen.getByText(`${(value * 100).toFixed(0)}%`)).toBeInTheDocument();
    });
  });

  it('calls onWeightChange when slider changes', () => {
    render(<WeightConfigurator {...mockProps} />);
    const slider = screen.getAllByRole('slider')[0];
    
    fireEvent.change(slider, { target: { value: '50' } });
    expect(mockProps.onWeightChange).toHaveBeenCalled();
  });
});

describe('MLInsightsPanel', () => {
  const mockPerformanceMetrics = {
    accuracy: 0.85,
    confidence: 0.8,
    learningRate: 0.1,
  };

  const mockRecentPredictions = [
    {
      predicted: 0.7,
      actual: 0.8,
      timestamp: new Date(),
    },
  ];

  it('displays performance metrics', () => {
    render(
      <MLInsightsPanel
        performanceMetrics={mockPerformanceMetrics}
        recentPredictions={mockRecentPredictions}
      />
    );

    expect(screen.getByText('85.0%')).toBeInTheDocument(); // Accuracy
    expect(screen.getByText('80.0%')).toBeInTheDocument(); // Confidence
    expect(screen.getByText('10.0%')).toBeInTheDocument(); // Learning Rate
  });

  it('shows recent predictions', () => {
    render(
      <MLInsightsPanel
        performanceMetrics={mockPerformanceMetrics}
        recentPredictions={mockRecentPredictions}
      />
    );

    expect(screen.getByText('Predicted: 70.0%')).toBeInTheDocument();
    expect(screen.getByText('Actual: 80.0%')).toBeInTheDocument();
  });
});

describe('HybridScoreVisualizer', () => {
  const mockMessage = {
    id: 'test-1',
    content: 'Test message content',
    timestamp: new Date(),
    references: ['ref-1'],
    hasResponse: true,
    participantCount: 2,
  };

  const mockProps = {
    message: mockMessage,
    userScore: 0.7,
    mlScore: 0.8,
    confidence: 0.85,
    weight: 0.3,
  };

  it('displays message content', () => {
    render(<HybridScoreVisualizer {...mockProps} />);
    expect(screen.getByText(mockMessage.content)).toBeInTheDocument();
  });

  it('shows all score components', () => {
    render(<HybridScoreVisualizer {...mockProps} />);
    
    expect(screen.getByText('70.0%')).toBeInTheDocument(); // User Score
    expect(screen.getByText('80.0%')).toBeInTheDocument(); // ML Score
    expect(screen.getByText('85.0%')).toBeInTheDocument(); // Confidence
  });

  it('displays metadata', () => {
    render(<HybridScoreVisualizer {...mockProps} />);
    
    expect(screen.getByText(`ID: ${mockMessage.id}`)).toBeInTheDocument();
    expect(screen.getByText('References: 1')).toBeInTheDocument();
  });

  it('calculates and displays final score', () => {
    render(<HybridScoreVisualizer {...mockProps} />);
    
    // Final score = (userScore * (1 - weight)) + (mlScore * weight)
    // = (0.7 * 0.7) + (0.8 * 0.3) = 0.49 + 0.24 = 0.73
    expect(screen.getByText('73.0%')).toBeInTheDocument();
  });
});

// Test utilities
const createMockMessage = (overrides = {}) => ({
  id: 'test-id',
  content: 'Test content',
  timestamp: new Date(),
  references: [],
  hasResponse: false,
  participantCount: 1,
  ...overrides,
});