import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import 'chart.js/auto';
import { Line } from 'react-chartjs-2';

interface TrainingMetricsChartProps {
  data: {
    epochs: number[];
    loss: number[];
    accuracy: number[];
    validationLoss?: number[];
    validationAccuracy?: number[];
  };
}

interface FeatureImportanceChartProps {
  data: Map<string, number>;
}

const TrainingMetricsChart: React.FC<TrainingMetricsChartProps> = ({ data }) => {
  const chartData = {
    labels: data.epochs,
    datasets: [
      {
        label: 'Loss',
        data: data.loss,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Accuracy',
        data: data.accuracy,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      ...(data.validationLoss ? [{
        label: 'Validation Loss',
        data: data.validationLoss,
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        borderDash: [5, 5],
      }] : []),
      ...(data.validationAccuracy ? [{
        label: 'Validation Accuracy',
        data: data.validationAccuracy,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderDash: [5, 5],
      }] : []),
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Training Metrics',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({ data }) => {
  const sortedFeatures = Array.from(data.entries())
    .sort((a, b) => b[1] - a[1]);

  const chartData = {
    labels: sortedFeatures.map(([feature]) => feature),
    datasets: [
      {
        label: 'Feature Importance',
        data: sortedFeatures.map(([_, value]) => value),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Feature Importance',
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

interface TrainingVisualizationProps {
  trainingMetrics: TrainingMetricsChartProps['data'];
  featureImportance: Map<string, number>;
}

export const TrainingVisualization: React.FC<TrainingVisualizationProps> = ({
  trainingMetrics,
  featureImportance,
}) => {
  return (
    <div className="training-visualization">
      <Card>
        <CardHeader>
          <CardTitle>Model Training Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="w-full">
              <TrainingMetricsChart data={trainingMetrics} />
            </div>
            <div className="w-full">
              <FeatureImportanceChart data={featureImportance} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};