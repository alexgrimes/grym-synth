import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DevDashboard } from '../DevDashboard';
import { devTesting } from '../../../utils/DevTesting';

// Mock devTesting
jest.mock('../../../utils/DevTesting', () => ({
  devTesting: {
    startSession: jest.fn(),
    endSession: jest.fn(),
    getCurrentMetrics: jest.fn(() => ({
      fps: 60,
      memory: 1024 * 1024 * 100, // 100MB
      audioLatency: 15.5
    })),
    toggleFeature: jest.fn(),
    exportSessionData: jest.fn(() => JSON.stringify({ test: 'data' }))
  }
}));

describe('DevDashboard', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });

  it('should not render when initially mounted', () => {
    render(<DevDashboard />);
    expect(screen.queryByText('Dev Testing Dashboard')).not.toBeInTheDocument();
  });

  it('should show/hide on Alt+D', () => {
    render(<DevDashboard />);

    // Initially hidden
    expect(screen.queryByText('Dev Testing Dashboard')).not.toBeInTheDocument();

    // Press Alt+D to show
    fireEvent.keyDown(window, { key: 'd', altKey: true });
    expect(screen.getByText('Dev Testing Dashboard')).toBeInTheDocument();

    // Press Alt+D again to hide
    fireEvent.keyDown(window, { key: 'd', altKey: true });
    expect(screen.queryByText('Dev Testing Dashboard')).not.toBeInTheDocument();
  });

  it('should start session and update metrics when shown', () => {
    jest.useFakeTimers();
    render(<DevDashboard />);

    // Show dashboard
    fireEvent.keyDown(window, { key: 'd', altKey: true });

    expect(devTesting.startSession).toHaveBeenCalledTimes(1);

    // Fast-forward timers to trigger metrics update
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(devTesting.getCurrentMetrics).toHaveBeenCalled();
    expect(screen.getByText('60.0')).toBeInTheDocument(); // FPS
    expect(screen.getByText('100.00 MB')).toBeInTheDocument(); // Memory
    expect(screen.getByText('15.50ms')).toBeInTheDocument(); // Audio Latency

    jest.useRealTimers();
  });

  it('should end session when hidden', () => {
    render(<DevDashboard />);

    // Show dashboard
    fireEvent.keyDown(window, { key: 'd', altKey: true });
    expect(devTesting.startSession).toHaveBeenCalledTimes(1);

    // Hide dashboard
    fireEvent.keyDown(window, { key: 'd', altKey: true });
    expect(devTesting.endSession).toHaveBeenCalledTimes(1);
  });

  it('should toggle features', () => {
    render(<DevDashboard />);

    // Show dashboard
    fireEvent.keyDown(window, { key: 'd', altKey: true });

    // Find and click feature toggle button
    const toggleButton = screen.getByRole('button', { name: /disabled/i });
    fireEvent.click(toggleButton);

    expect(devTesting.toggleFeature).toHaveBeenCalled();
  });

  it('should export session data', () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockCreateObjectURL = jest.fn(() => 'blob:test');
    const mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    render(<DevDashboard />);

    // Show dashboard
    fireEvent.keyDown(window, { key: 'd', altKey: true });

    // Click export button
    fireEvent.click(screen.getByText('Export Session Data'));

    expect(devTesting.exportSessionData).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });
});
