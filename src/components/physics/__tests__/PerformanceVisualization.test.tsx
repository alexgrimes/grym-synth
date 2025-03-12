import React from 'react';
import { render, act } from '@testing-library/react';
import { PerformanceVisualization } from '../PerformanceVisualization';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { setupCanvasMock, mockContext } from '../../../test/mocks/canvasMock';

describe('PerformanceVisualization', () => {
  let monitor: PerformanceMonitor;
  let mockGetAverageMetrics: jest.SpyInstance;
  let mockGetPerformanceReport: jest.SpyInstance;
  let mockCanvas: ReturnType<typeof setupCanvasMock>;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    mockGetAverageMetrics = jest.spyOn(monitor, 'getAverageMetrics');
    mockGetPerformanceReport = jest.spyOn(monitor, 'getPerformanceReport');
    mockCanvas = setupCanvasMock();

    // Mock performance.now for consistent timing
    jest.spyOn(performance, 'now').mockReturnValue(0);

    // Reset all canvas mock functions
    Object.values(mockContext)
      .filter(value => typeof value === 'function')
      .forEach(mockFn => mockFn.mockClear());
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockCanvas.cleanup();
  });

  it('should render graph when showGraph is true', () => {
    const { container } = render(
      <PerformanceVisualization
        monitor={monitor}
        width={300}
        height={150}
        showGraph={true}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('width', '300');
    expect(canvas).toHaveAttribute('height', '150');
  });

  it('should not render graph when showGraph is false', () => {
    const { container } = render(
      <PerformanceVisualization
        monitor={monitor}
        showGraph={false}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeInTheDocument();
  });

  it('should render stats when showStats is true', () => {
    mockGetPerformanceReport.mockReturnValue('Test Performance Report');

    const { container } = render(
      <PerformanceVisualization
        monitor={monitor}
        showStats={true}
      />
    );

    const stats = container.querySelector('pre');
    expect(stats).toBeInTheDocument();
    expect(stats).toHaveTextContent('Test Performance Report');
  });

  it('should not render stats when showStats is false', () => {
    const { container } = render(
      <PerformanceVisualization
        monitor={monitor}
        showStats={false}
      />
    );

    const stats = container.querySelector('pre');
    expect(stats).not.toBeInTheDocument();
  });

  it('should update graph with performance metrics', async () => {
    // Mock metrics data
    const mockMetrics = {
      frameTime: 16.67,
      updateTime: 8,
      physicsTime: 4,
      renderTime: 4,
      fieldCount: 10,
      parameterCount: 100
    };

    mockGetAverageMetrics.mockReturnValue(mockMetrics);

    jest.useFakeTimers();

    render(
      <PerformanceVisualization
        monitor={monitor}
        refreshRate={16}
      />
    );

    // Advance timers to trigger updates
    await act(async () => {
      jest.advanceTimersByTime(32); // Two frames
    });

    // Verify canvas drawing operations
    expect(mockContext.clearRect).toHaveBeenCalled();
    expect(mockContext.fillRect).toHaveBeenCalled();
    expect(mockContext.drawImage).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should respect refresh rate for updates', async () => {
    jest.useFakeTimers();

    const refreshRate = 100; // 10fps
    render(
      <PerformanceVisualization
        monitor={monitor}
        refreshRate={refreshRate}
      />
    );

    // Reset mock calls
    mockGetAverageMetrics.mockClear();

    // Advance time by less than refresh rate
    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(mockGetAverageMetrics).not.toHaveBeenCalled();

    // Advance time beyond refresh rate
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(mockGetAverageMetrics).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should cleanup on unmount', async () => {
    jest.useFakeTimers();

    const { unmount } = render(
      <PerformanceVisualization
        monitor={monitor}
      />
    );

    unmount();

    // Advance timers
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Verify no more updates after unmount
    expect(mockGetAverageMetrics).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should handle missing metrics data gracefully', () => {
    mockGetAverageMetrics.mockReturnValue({});
    mockGetPerformanceReport.mockReturnValue('No Data');

    const { container } = render(
      <PerformanceVisualization
        monitor={monitor}
      />
    );

    const stats = container.querySelector('pre');
    expect(stats).toHaveTextContent('No Data');
  });

  it('should draw performance threshold line', async () => {
    mockGetAverageMetrics.mockReturnValue({
      frameTime: 16.67
    });

    render(
      <PerformanceVisualization
        monitor={monitor}
      />
    );

    await act(async () => {
      jest.advanceTimersByTime(16);
    });

    expect(mockContext.beginPath).toHaveBeenCalled();
    expect(mockContext.moveTo).toHaveBeenCalled();
    expect(mockContext.lineTo).toHaveBeenCalled();
    expect(mockContext.stroke).toHaveBeenCalled();
  });
});
