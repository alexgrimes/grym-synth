import {
    formatBytes,
    formatDuration,
    formatNumber,
    getThresholdColor,
    calculateEMA,
    detectAnomalies,
    smoothData,
    interpolateData,
    calculateRateOfChange
} from '../utils';

describe('Dashboard Utility Functions', () => {
    describe('formatBytes', () => {
        it('formats bytes correctly', () => {
            expect(formatBytes(0)).toBe('0 B');
            expect(formatBytes(1024)).toBe('1.00 KB');
            expect(formatBytes(1048576)).toBe('1.00 MB');
            expect(formatBytes(1073741824)).toBe('1.00 GB');
        });

        it('handles decimal values', () => {
            expect(formatBytes(1536)).toBe('1.50 KB');
            expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.50 MB');
        });
    });

    describe('formatDuration', () => {
        it('formats durations correctly', () => {
            expect(formatDuration(500)).toBe('500ms');
            expect(formatDuration(1500)).toBe('1.5s');
            expect(formatDuration(60000)).toBe('1m 0s');
            expect(formatDuration(3600000)).toBe('1h 0m');
        });

        it('handles mixed durations', () => {
            expect(formatDuration(3661000)).toBe('1h 1m');
            expect(formatDuration(65000)).toBe('1m 5s');
        });
    });

    describe('formatNumber', () => {
        it('formats numbers with specified decimals', () => {
            expect(formatNumber(123.456, 2)).toBe('123.46');
            expect(formatNumber(123.456, 0)).toBe('123');
        });

        it('handles units', () => {
            expect(formatNumber(123.456, 2, '%')).toBe('123.46%');
            expect(formatNumber(123, 0, 'MB')).toBe('123MB');
        });

        it('handles invalid input', () => {
            expect(formatNumber(null)).toBe('N/A');
            expect(formatNumber(undefined)).toBe('N/A');
        });
    });

    describe('getThresholdColor', () => {
        const thresholds = { warning: 70, danger: 90 };

        it('returns correct colors based on thresholds', () => {
            expect(getThresholdColor(50, thresholds)).toBe('var(--success-color)');
            expect(getThresholdColor(75, thresholds)).toBe('var(--warning-color)');
            expect(getThresholdColor(95, thresholds)).toBe('var(--danger-color)');
        });
    });

    describe('calculateEMA', () => {
        it('calculates exponential moving average', () => {
            const values = [1, 2, 3, 4, 5];
            const period = 3;
            const ema = calculateEMA(values, period);
            expect(ema).toBeCloseTo(3.916, 2);
        });

        it('handles single value', () => {
            expect(calculateEMA([10], 3)).toBe(10);
        });
    });

    describe('detectAnomalies', () => {
        it('detects anomalies using z-score', () => {
            const values = [1, 2, 2, 3, 10]; // 10 is anomaly
            const result = detectAnomalies(values);
            
            expect(result.find(r => r.value === 10)?.isAnomaly).toBe(true);
            expect(result.find(r => r.value === 2)?.isAnomaly).toBe(false);
        });

        it('respects custom threshold', () => {
            const values = [1, 2, 2, 3, 5];
            const result = detectAnomalies(values, 1);
            expect(result.find(r => r.value === 5)?.isAnomaly).toBe(true);
        });
    });

    describe('smoothData', () => {
        it('smooths data using moving average', () => {
            const data = [1, 3, 2, 4, 5];
            const smoothed = smoothData(data, 3);
            
            expect(smoothed[2]).toBeCloseTo(2); // Average of [1,3,2]
            expect(smoothed[4]).toBeCloseTo(3.67, 1); // Average of [2,4,5]
        });

        it('handles window size larger than data', () => {
            const data = [1, 2, 3];
            const smoothed = smoothData(data, 5);
            expect(smoothed).toHaveLength(data.length);
        });
    });

    describe('interpolateData', () => {
        it('interpolates missing data points', () => {
            const data = [
                { timestamp: 0, value: 10 },
                { timestamp: 2, value: 20 }
            ];
            const timestamps = [0, 1, 2];
            const interpolated = interpolateData(data, timestamps);
            
            expect(interpolated).toEqual([10, 15, 20]);
        });

        it('handles missing boundary points', () => {
            const data = [{ timestamp: 1, value: 10 }];
            const timestamps = [0, 1, 2];
            const interpolated = interpolateData(data, timestamps);
            
            expect(interpolated[0]).toBe(10);
            expect(interpolated[2]).toBe(10);
        });
    });

    describe('calculateRateOfChange', () => {
        it('calculates rate of change between consecutive values', () => {
            const values = [100, 120, 90];
            const roc = calculateRateOfChange(values);
            
            expect(roc[0]).toBe(20); // ((120-100)/100)*100
            expect(roc[1]).toBe(-25); // ((90-120)/120)*100
        });

        it('handles empty or single value arrays', () => {
            expect(calculateRateOfChange([])).toHaveLength(0);
            expect(calculateRateOfChange([1])).toHaveLength(0);
        });
    });
});