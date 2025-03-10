import { MemorySnapshot, ModelEvent } from './memory-profile';
import * as fs from 'fs';
import * as path from 'path';

export interface MemoryVisualization {
  timestamps: number[];
  heapUsage: number[];
  externalUsage: number[];
  modelEvents: {
    time: number;
    event: 'load' | 'unload';
    model: string;
  }[];
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    fill?: boolean;
  }[];
}

export class MemoryVisualizer {
  private data: MemoryVisualization = {
    timestamps: [],
    heapUsage: [],
    externalUsage: [],
    modelEvents: []
  };

  track(snapshot: MemorySnapshot, event?: ModelEvent): void {
    this.data.timestamps.push(snapshot.timestamp);
    this.data.heapUsage.push(snapshot.heap);
    this.data.externalUsage.push(snapshot.external);

    if (event) {
      this.data.modelEvents.push({
        time: snapshot.timestamp,
        event: event.type,
        model: event.model
      });
    }
  }

  private generateChartConfig(memoryLimit: number): ChartData {
    return {
      labels: this.data.timestamps.map(t => this.formatTime(t)),
      datasets: [
        {
          label: 'Heap Usage',
          data: this.data.heapUsage.map(bytes => bytes / 1024 / 1024), // Convert to MB
          borderColor: 'rgb(75, 192, 192)',
          fill: false
        },
        {
          label: 'External Memory',
          data: this.data.externalUsage.map(bytes => bytes / 1024 / 1024),
          borderColor: 'rgb(153, 102, 255)',
          fill: false
        }
      ]
    };
  }

  async generateReport(outputPath: string, memoryLimit: number): Promise<void> {
    const chartConfig = this.generateChartConfig(memoryLimit);
    const eventMarkers = this.generateEventMarkers();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Memory Usage Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .container {
            width: 90%;
            margin: 20px auto;
        }
        .chart-container {
            position: relative;
            height: 400px;
        }
        .event-list {
            margin-top: 20px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 4px;
        }
        .event {
            margin: 5px 0;
            padding: 5px;
            border-left: 3px solid #666;
        }
        .load { border-color: #4CAF50; }
        .unload { border-color: #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Memory Usage Over Time</h2>
        <div class="chart-container">
            <canvas id="memoryChart"></canvas>
        </div>
        <div class="event-list">
            <h3>Model Events</h3>
            ${eventMarkers}
        </div>
    </div>

    <script>
        const ctx = document.getElementById('memoryChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: ${JSON.stringify(chartConfig)},
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Memory Usage (MB)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                plugins: {
                    annotation: {
                        annotations: {
                            limit: {
                                type: 'line',
                                yMin: ${memoryLimit / 1024 / 1024},
                                yMax: ${memoryLimit / 1024 / 1024},
                                borderColor: 'rgb(255, 99, 132)',
                                borderWidth: 2,
                                label: {
                                    content: 'Memory Limit',
                                    enabled: true
                                }
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(outputPath, html);
  }

  private generateEventMarkers(): string {
    return this.data.modelEvents
      .map(event => `
        <div class="event ${event.event}">
          ${this.formatTime(event.time)}: ${event.event} - ${event.model}
        </div>
      `)
      .join('');
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getVisualizationData(): MemoryVisualization {
    return { ...this.data };
  }
}