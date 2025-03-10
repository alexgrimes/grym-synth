const fs = require('fs').promises;
const path = require('path');

class PerformanceTracker {
    constructor() {
        this.historyPath = path.join(__dirname, 'test-reports', 'history.json');
        this.maxHistoryEntries = 100; // Keep last 100 test runs
    }

    async initialize() {
        try {
            await fs.access(this.historyPath);
        } catch {
            await this.saveHistory({ entries: [] });
        }
    }

    async addEntry(testResults, coverageData) {
        const history = await this.loadHistory();
        const entry = this.createHistoryEntry(testResults, coverageData);
        
        history.entries.unshift(entry);
        
        // Maintain maximum history size
        if (history.entries.length > this.maxHistoryEntries) {
            history.entries = history.entries.slice(0, this.maxHistoryEntries);
        }

        await this.saveHistory(history);
        return entry;
    }

    createHistoryEntry(testResults, coverageData) {
        return {
            timestamp: new Date().toISOString(),
            duration: testResults.endTime - testResults.startTime,
            tests: {
                total: testResults.numTotalTests,
                passed: testResults.numPassedTests,
                failed: testResults.numFailedTests,
                skipped: testResults.numPendingTests
            },
            coverage: {
                lines: coverageData?.total?.lines?.pct || 0,
                functions: coverageData?.total?.functions?.pct || 0,
                branches: coverageData?.total?.branches?.pct || 0,
                statements: coverageData?.total?.statements?.pct || 0
            },
            performance: {
                avgTestDuration: this.calculateAverageTestDuration(testResults),
                slowestTests: this.findSlowestTests(testResults),
                memoryUsage: process.memoryUsage()
            }
        };
    }

    calculateAverageTestDuration(testResults) {
        if (!testResults.testResults?.length) return 0;
        const totalDuration = testResults.testResults.reduce(
            (sum, suite) => sum + suite.perfStats.runtime,
            0
        );
        return totalDuration / testResults.numTotalTests;
    }

    findSlowestTests(testResults) {
        if (!testResults.testResults) return [];

        const allTests = testResults.testResults.flatMap(suite =>
            suite.testResults.map(test => ({
                name: `${suite.testFilePath}::${test.title}`,
                duration: test.duration
            }))
        );

        return allTests
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5);
    }

    async loadHistory() {
        try {
            const data = await fs.readFile(this.historyPath, 'utf8');
            return JSON.parse(data);
        } catch {
            return { entries: [] };
        }
    }

    async saveHistory(history) {
        await fs.writeFile(
            this.historyPath,
            JSON.stringify(history, null, 2)
        );
    }

    async generateTrendData() {
        const history = await this.loadHistory();
        const entries = history.entries;

        return {
            timeSeries: this.generateTimeSeries(entries),
            trends: this.analyzeTrends(entries),
            patterns: this.detectPatterns(entries),
            recommendations: this.generateRecommendations(entries)
        };
    }

    generateTimeSeries(entries) {
        const timestamps = entries.map(e => new Date(e.timestamp).getTime());
        return {
            testDuration: {
                labels: timestamps,
                data: entries.map(e => e.duration)
            },
            coverage: {
                labels: timestamps,
                lines: entries.map(e => e.coverage.lines),
                functions: entries.map(e => e.coverage.functions),
                branches: entries.map(e => e.coverage.branches)
            },
            performance: {
                labels: timestamps,
                avgDuration: entries.map(e => e.performance.avgTestDuration),
                memoryUsage: entries.map(e => e.performance.memoryUsage.heapUsed)
            }
        };
    }

    analyzeTrends(entries) {
        if (entries.length < 2) return null;

        const latest = entries[0];
        const previous = entries[1];
        const weekAgo = entries.find(e => 
            new Date(e.timestamp) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ) || previous;

        return {
            coverage: this.calculateTrend(latest.coverage, previous.coverage, weekAgo.coverage),
            performance: {
                testDuration: this.calculatePercentageChange(
                    latest.duration,
                    previous.duration
                ),
                avgTestDuration: this.calculatePercentageChange(
                    latest.performance.avgTestDuration,
                    previous.performance.avgTestDuration
                ),
                memoryUsage: this.calculatePercentageChange(
                    latest.performance.memoryUsage.heapUsed,
                    previous.performance.memoryUsage.heapUsed
                )
            }
        };
    }

    calculateTrend(current, previous, weekAgo) {
        const metrics = ['lines', 'functions', 'branches', 'statements'];
        return Object.fromEntries(
            metrics.map(metric => [
                metric,
                {
                    current: current[metric],
                    change: this.calculatePercentageChange(
                        current[metric],
                        previous[metric]
                    ),
                    weeklyChange: this.calculatePercentageChange(
                        current[metric],
                        weekAgo[metric]
                    )
                }
            ])
        );
    }

    calculatePercentageChange(current, previous) {
        if (!previous) return 0;
        return ((current - previous) / previous) * 100;
    }

    detectPatterns(entries) {
        return {
            testFailures: this.analyzeFailurePatterns(entries),
            performance: this.analyzePerformancePatterns(entries),
            coverage: this.analyzeCoveragePatterns(entries)
        };
    }

    analyzeFailurePatterns(entries) {
        const patterns = entries.map(e => ({
            timestamp: e.timestamp,
            failureRate: e.tests.failed / e.tests.total
        }));

        return {
            trend: this.calculateTrendDirection(patterns.map(p => p.failureRate)),
            anomalies: this.detectAnomalies(patterns.map(p => p.failureRate))
        };
    }

    analyzePerformancePatterns(entries) {
        const durations = entries.map(e => e.performance.avgTestDuration);
        return {
            trend: this.calculateTrendDirection(durations),
            anomalies: this.detectAnomalies(durations)
        };
    }

    analyzeCoveragePatterns(entries) {
        const coverageMetrics = entries.map(e => ({
            timestamp: e.timestamp,
            average: Object.values(e.coverage).reduce((a, b) => a + b, 0) / 4
        }));

        return {
            trend: this.calculateTrendDirection(coverageMetrics.map(m => m.average)),
            stability: this.calculateStability(coverageMetrics.map(m => m.average))
        };
    }

    calculateTrendDirection(values) {
        if (values.length < 2) return 'stable';
        const changes = values.slice(1).map((val, i) => val - values[i]);
        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
        
        if (Math.abs(avgChange) < 0.01) return 'stable';
        return avgChange > 0 ? 'improving' : 'degrading';
    }

    detectAnomalies(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(
            values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
        );

        return values
            .map((value, index) => ({
                value,
                index,
                isAnomaly: Math.abs(value - mean) > 2 * stdDev
            }))
            .filter(item => item.isAnomaly);
    }

    calculateStability(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length;
        return 1 - Math.sqrt(variance) / mean; // Higher is more stable
    }

    generateRecommendations(entries) {
        const recommendations = [];
        const latest = entries[0];
        const trends = this.analyzeTrends(entries);

        if (trends.performance.testDuration > 10) {
            recommendations.push('Test execution time has increased significantly. Consider optimizing slow tests.');
        }

        if (trends.coverage.lines.weeklyChange < -5) {
            recommendations.push('Line coverage has decreased over the past week. Review recent changes and add missing tests.');
        }

        if (this.analyzeFailurePatterns(entries).trend === 'degrading') {
            recommendations.push('Test stability is decreasing. Investigate flaky tests and improve reliability.');
        }

        const memoryTrend = this.calculateTrendDirection(
            entries.map(e => e.performance.memoryUsage.heapUsed)
        );
        if (memoryTrend === 'degrading') {
            recommendations.push('Memory usage is trending upward. Check for memory leaks in tests.');
        }

        return recommendations;
    }
}

module.exports = new PerformanceTracker();