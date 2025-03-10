import React, { useEffect, useState } from 'react';
import { SystemHealthStatus } from '../../services/api/types';

export interface SystemHealthDashboardProps {
  refreshInterval?: number;
  onAlert?: (metric: string, value: number) => void;
}

const SystemHealthDashboard: React.FC<SystemHealthDashboardProps> = ({
  refreshInterval = 5000,
  onAlert,
}) => {
  const [healthStatus, setHealthStatus] = useState<SystemHealthStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        // In a real implementation, this would call your API
        const mockStatus: SystemHealthStatus = {
          status: 'healthy',
          message: 'All systems operational',
          lastChecked: new Date().toISOString(),
          metrics: {
            cpu: {
              total: 100,
              used: Math.random() * 100,
              free: 0,
              percentage: 0,
              timestamp: new Date().toISOString(),
              value: 0,
              unit: '%'
            },
            memory: {
              total: 16 * 1024 * 1024 * 1024,
              used: Math.random() * 16 * 1024 * 1024 * 1024,
              free: 0,
              percentage: 0,
              timestamp: new Date().toISOString(),
              value: 0,
              unit: 'bytes'
            },
            storage: {
              total: 1000 * 1024 * 1024 * 1024,
              used: Math.random() * 1000 * 1024 * 1024 * 1024,
              free: 0,
              percentage: 0,
              timestamp: new Date().toISOString(),
              value: 0,
              unit: 'bytes'
            },
            network: {
              bytesIn: Math.random() * 1000000,
              bytesOut: Math.random() * 1000000,
              latency: Math.random() * 100
            },
            processing: {
              queueLength: Math.floor(Math.random() * 10),
              activeJobs: Math.floor(Math.random() * 5),
              completedJobs: Math.floor(Math.random() * 100),
              failedJobs: Math.floor(Math.random() * 3)
            }
          }
        };

        // Calculate percentages
        mockStatus.metrics.cpu.percentage = (mockStatus.metrics.cpu.used / mockStatus.metrics.cpu.total) * 100;
        mockStatus.metrics.memory.percentage = (mockStatus.metrics.memory.used / mockStatus.metrics.memory.total) * 100;
        mockStatus.metrics.storage.percentage = (mockStatus.metrics.storage.used / mockStatus.metrics.storage.total) * 100;

        // Calculate free resources
        mockStatus.metrics.cpu.free = mockStatus.metrics.cpu.total - mockStatus.metrics.cpu.used;
        mockStatus.metrics.memory.free = mockStatus.metrics.memory.total - mockStatus.metrics.memory.used;
        mockStatus.metrics.storage.free = mockStatus.metrics.storage.total - mockStatus.metrics.storage.used;

        setHealthStatus(mockStatus);
        setLastUpdate(new Date());

        // Check for alerts
        if (onAlert) {
          if (mockStatus.metrics.cpu.percentage > 90) {
            onAlert('CPU Usage', mockStatus.metrics.cpu.percentage);
          }
          if (mockStatus.metrics.memory.percentage > 90) {
            onAlert('Memory Usage', mockStatus.metrics.memory.percentage);
          }
          if (mockStatus.metrics.processing.failedJobs > 0) {
            onAlert('Failed Jobs', mockStatus.metrics.processing.failedJobs);
          }
        }
      } catch (error) {
        console.error('Error fetching health status:', error);
      }
    };

    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, onAlert]);

  if (!healthStatus) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  const getStatusColor = (percentage: number): string => {
    if (percentage > 90) return 'text-red-500';
    if (percentage > 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className={`font-semibold ${getStatusColor(healthStatus.metrics.cpu.percentage)}`}>
          {healthStatus.status.toUpperCase()}
        </div>
        <div className="text-xs text-gray-400">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-sm">
            <span>CPU Usage</span>
            <span className={getStatusColor(healthStatus.metrics.cpu.percentage)}>
              {healthStatus.metrics.cpu.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded">
            <div
              className={`h-full rounded ${getStatusColor(healthStatus.metrics.cpu.percentage)}`}
              style={{ width: `${healthStatus.metrics.cpu.percentage}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm">
            <span>Memory</span>
            <span className={getStatusColor(healthStatus.metrics.memory.percentage)}>
              {formatBytes(healthStatus.metrics.memory.used)} / {formatBytes(healthStatus.metrics.memory.total)}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded">
            <div
              className={`h-full rounded ${getStatusColor(healthStatus.metrics.memory.percentage)}`}
              style={{ width: `${healthStatus.metrics.memory.percentage}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Active Jobs</span>
            <div className="font-semibold">{healthStatus.metrics.processing.activeJobs}</div>
          </div>
          <div>
            <span className="text-gray-400">Queue Length</span>
            <div className="font-semibold">{healthStatus.metrics.processing.queueLength}</div>
          </div>
          <div>
            <span className="text-gray-400">Completed</span>
            <div className="font-semibold">{healthStatus.metrics.processing.completedJobs}</div>
          </div>
          <div>
            <span className="text-gray-400">Failed</span>
            <div className={`font-semibold ${healthStatus.metrics.processing.failedJobs > 0 ? 'text-red-500' : ''}`}>
              {healthStatus.metrics.processing.failedJobs}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthDashboard;