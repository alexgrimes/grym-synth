const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class TestReportGenerator {
    constructor() {
        this.coverageDir = path.join(__dirname, 'coverage');
        this.reportDir = path.join(__dirname, 'test-reports');
        this.testResults = {};
        this.coverageData = {};
    }

    async generate() {
        await this.ensureDirectories();
        await this.collectData();
        await this.generateHTML();
        await this.generateJSON();
    }

    async ensureDirectories() {
        await fs.promises.mkdir(this.reportDir, { recursive: true });
    }

    async collectData() {
        // Read Jest test results
        const testResultsPath = path.join(this.coverageDir, 'test-results.json');
        if (fs.existsSync(testResultsPath)) {
            this.testResults = JSON.parse(await fs.promises.readFile(testResultsPath, 'utf8'));
        }

        // Read coverage data
        const coveragePath = path.join(this.coverageDir, 'coverage-summary.json');
        if (fs.existsSync(coveragePath)) {
            this.coverageData = JSON.parse(await fs.promises.readFile(coveragePath, 'utf8'));
        }
    }

    async generateHTML() {
        const html = this.generateHTMLContent();
        await fs.promises.writeFile(
            path.join(this.reportDir, 'index.html'),
            html
        );
    }

    generateHTMLContent() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - Dashboard Tests</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --primary-color: #2196f3;
            --success-color: #4caf50;
            --warning-color: #ff9800;
            --danger-color: #f44336;
            --background-color: #f5f5f5;
        }

        body {
            font-family: -apple-system, system-ui, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--background-color);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .header {
            margin-bottom: 30px;
        }

        .chart-container {
            position: relative;
            height: 300px;
            margin-bottom: 30px;
        }

        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .metric {
            padding: 15px;
            border-radius: 4px;
            color: white;
            text-align: center;
        }

        .metric.success { background-color: var(--success-color); }
        .metric.warning { background-color: var(--warning-color); }
        .metric.danger { background-color: var(--danger-color); }

        .test-list {
            margin-top: 20px;
        }

        .test-item {
            padding: 10px;
            border-left: 4px solid transparent;
            margin-bottom: 8px;
        }

        .test-item.success { border-color: var(--success-color); }
        .test-item.failure { border-color: var(--danger-color); }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        th {
            background-color: #f8f9fa;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header card">
            <h1>Test Report - Dashboard Tests</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <div class="metrics">
            <div class="metric ${this.getStatusClass(this.testResults.success)}">
                <h3>Tests Passed</h3>
                <p>${this.testResults.numPassedTests || 0}/${this.testResults.numTotalTests || 0}</p>
            </div>
            <div class="metric ${this.getCoverageClass(this.coverageData?.total?.lines?.pct)}">
                <h3>Line Coverage</h3>
                <p>${this.coverageData?.total?.lines?.pct || 0}%</p>
            </div>
            <div class="metric ${this.getCoverageClass(this.coverageData?.total?.functions?.pct)}">
                <h3>Function Coverage</h3>
                <p>${this.coverageData?.total?.functions?.pct || 0}%</p>
            </div>
        </div>

        <div class="card">
            <h2>Coverage Overview</h2>
            <div class="chart-container">
                <canvas id="coverageChart"></canvas>
            </div>
        </div>

        <div class="card">
            <h2>Test Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Suite</th>
                        <th>Tests</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.generateTestTable()}
                </tbody>
            </table>
        </div>

        <div class="card">
            <h2>Coverage Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Lines</th>
                        <th>Functions</th>
                        <th>Branches</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.generateCoverageTable()}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // Initialize charts
        const coverageChart = new Chart(
            document.getElementById('coverageChart'),
            {
                type: 'bar',
                data: {
                    labels: ['Lines', 'Functions', 'Branches', 'Statements'],
                    datasets: [{
                        label: 'Coverage %',
                        data: [
                            ${this.coverageData?.total?.lines?.pct || 0},
                            ${this.coverageData?.total?.functions?.pct || 0},
                            ${this.coverageData?.total?.branches?.pct || 0},
                            ${this.coverageData?.total?.statements?.pct || 0}
                        ],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            }
        );
    </script>
</body>
</html>`;
    }

    getStatusClass(value) {
        if (value > 0.9) return 'success';
        if (value > 0.7) return 'warning';
        return 'danger';
    }

    getCoverageClass(value) {
        if (value >= 85) return 'success';
        if (value >= 70) return 'warning';
        return 'danger';
    }

    generateTestTable() {
        if (!this.testResults.testResults) return '';

        return this.testResults.testResults.map(suite => `
            <tr>
                <td>${suite.testFilePath.split('/').pop()}</td>
                <td>${suite.numPassingTests + suite.numFailingTests}</td>
                <td>${suite.numPassingTests}</td>
                <td>${suite.numFailingTests}</td>
                <td>${suite.perfStats.runtime}ms</td>
            </tr>
        `).join('');
    }

    generateCoverageTable() {
        if (!this.coverageData) return '';

        return Object.entries(this.coverageData)
            .filter(([key]) => key !== 'total')
            .map(([file, coverage]) => `
                <tr>
                    <td>${file}</td>
                    <td>${coverage.lines.pct}%</td>
                    <td>${coverage.functions.pct}%</td>
                    <td>${coverage.branches.pct}%</td>
                </tr>
            `).join('');
    }

    async generateJSON() {
        const summary = {
            timestamp: new Date().toISOString(),
            testResults: {
                total: this.testResults.numTotalTests || 0,
                passed: this.testResults.numPassedTests || 0,
                failed: this.testResults.numFailedTests || 0,
                duration: this.testResults.startTime ? 
                    this.testResults.endTime - this.testResults.startTime : 0
            },
            coverage: {
                lines: this.coverageData?.total?.lines?.pct || 0,
                functions: this.coverageData?.total?.functions?.pct || 0,
                branches: this.coverageData?.total?.branches?.pct || 0,
                statements: this.coverageData?.total?.statements?.pct || 0
            }
        };

        await fs.promises.writeFile(
            path.join(this.reportDir, 'test-results.json'),
            JSON.stringify(summary, null, 2)
        );
    }
}

// Generate report when run directly
if (require.main === module) {
    const generator = new TestReportGenerator();
    generator.generate().catch(console.error);
}