import React, { useEffect, useState, useCallback } from 'react';
import { devTesting } from '../../utils/DevTesting';

interface MetricsData {
  fps: number;
  memory: number;
  audioLatency: number;
}

export function DevDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<MetricsData>({
    fps: 0,
    memory: 0,
    audioLatency: 0
  });
  const [activeFeatures, setActiveFeatures] = useState<Map<string, boolean>>(new Map());
  const [sessionData, setSessionData] = useState<any>(null);

  const updateMetrics = useCallback(() => {
    const currentMetrics = devTesting.getCurrentMetrics();
    setMetrics({
      fps: currentMetrics.fps || 0,
      memory: currentMetrics.memory || 0,
      audioLatency: currentMetrics.audioLatency || 0
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Start metrics update interval when dashboard is visible
    let intervalId: number;
    if (isVisible) {
      intervalId = window.setInterval(updateMetrics, 1000);
      devTesting.startSession();
    } else {
      devTesting.endSession();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isVisible, updateMetrics]);

  const toggleFeature = useCallback((featureName: string) => {
    const newState = !activeFeatures.get(featureName);
    setActiveFeatures(prev => new Map(prev).set(featureName, newState));
    devTesting.toggleFeature(featureName, newState);
  }, [activeFeatures]);

  if (!isVisible) return null;

  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="fixed bottom-0 right-0 w-96 bg-gray-900 text-white p-4 rounded-tl-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Dev Testing Dashboard</h2>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Performance Metrics */}
        <section className="border-b border-gray-700 pb-4">
          <h3 className="text-lg font-semibold mb-2">Performance Metrics</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-400">FPS</label>
              <div className="text-xl">{metrics.fps.toFixed(1)}</div>
            </div>
            <div>
              <label className="text-gray-400">Memory</label>
              <div className="text-xl">{formatBytes(metrics.memory)}</div>
            </div>
            <div>
              <label className="text-gray-400">Audio Latency</label>
              <div className="text-xl">{metrics.audioLatency.toFixed(2)}ms</div>
            </div>
          </div>
        </section>

        {/* Feature Toggles */}
        <section className="border-b border-gray-700 pb-4">
          <h3 className="text-lg font-semibold mb-2">Feature Toggles</h3>
          <div className="space-y-2">
            {Array.from(activeFeatures.entries()).map(([feature, enabled]) => (
              <div key={feature} className="flex items-center justify-between">
                <span>{feature}</span>
                <button
                  onClick={() => toggleFeature(feature)}
                  className={`px-3 py-1 rounded ${
                    enabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  {enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Session Data */}
        <section>
          <h3 className="text-lg font-semibold mb-2">Session Data</h3>
          <button
            onClick={() => {
              const data = devTesting.exportSessionData();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'session-data.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Export Session Data
          </button>
        </section>
      </div>
    </div>
  );
}
