/**
 * Formats a number of bytes into a human-readable string
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Formats a duration in milliseconds into a human-readable string
 */
export function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

/**
 * Formats a number with fixed decimal places and units
 */
export function formatNumber(value, decimals = 1, unit = '') {
    if (typeof value !== 'number') return 'N/A';
    return `${value.toFixed(decimals)}${unit}`;
}

/**
 * Generates a color based on a threshold value
 */
export function getThresholdColor(value, thresholds) {
    const { warning, danger } = thresholds;
    if (value >= danger) return 'var(--danger-color)';
    if (value >= warning) return 'var(--warning-color)';
    return 'var(--success-color)';
}

/**
 * Creates a throttled function that limits the rate of execution
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Calculates exponential moving average
 */
export function calculateEMA(values, period) {
    const k = 2 / (period + 1);
    let ema = values[0];
    
    for (let i = 1; i < values.length; i++) {
        ema = values[i] * k + ema * (1 - k);
    }
    
    return ema;
}

/**
 * Detects anomalies using Z-score
 */
export function detectAnomalies(values, threshold = 2) {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const stdDev = Math.sqrt(
        values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
    );

    return values.map((value, index) => {
        const zScore = Math.abs((value - mean) / stdDev);
        return {
            value,
            index,
            isAnomaly: zScore > threshold
        };
    });
}

/**
 * Smooths data using simple moving average
 */
export function smoothData(data, windowSize) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const window = data.slice(start, i + 1);
        const average = window.reduce((a, b) => a + b) / window.length;
        result.push(average);
    }
    return result;
}

/**
 * Interpolates missing data points
 */
export function interpolateData(data, timestamps) {
    const result = [];
    for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const point = data.find(d => d.timestamp === timestamp);
        
        if (point) {
            result.push(point.value);
        } else {
            // Find nearest points
            const before = data.filter(d => d.timestamp < timestamp).pop();
            const after = data.find(d => d.timestamp > timestamp);
            
            if (before && after) {
                const ratio = (timestamp - before.timestamp) / (after.timestamp - before.timestamp);
                result.push(before.value + (after.value - before.value) * ratio);
            } else {
                result.push(before?.value || after?.value || null);
            }
        }
    }
    return result;
}

/**
 * Formats a timestamp into a readable string
 */
export function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
}

/**
 * Calculates the rate of change between consecutive values
 */
export function calculateRateOfChange(values) {
    return values.slice(1).map((value, index) => {
        const previous = values[index];
        return ((value - previous) / previous) * 100;
    });
}

/**
 * Generates threshold bands for charts
 */
export function generateThresholdBands(min, max, thresholds) {
    return [
        {
            threshold: thresholds.warning,
            color: 'rgba(255, 152, 0, 0.1)',
            label: 'Warning'
        },
        {
            threshold: thresholds.danger,
            color: 'rgba(244, 67, 54, 0.1)',
            label: 'Danger'
        }
    ].filter(band => band.threshold >= min && band.threshold <= max);
}