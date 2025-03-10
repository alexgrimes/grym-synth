import { createCharts } from './charts.js';
import { formatBytes, formatDuration, formatNumber } from './utils.js';

class Dashboard {
    constructor() {
        this.ws = null;
        this.sessionId = null;
        this.charts = null;
        this.data = {
            cpu: [],
            memory: [],
            load: [],
            alerts: [],
            violations: []
        };

        this.initializeUI();
        this.connectWebSocket();
    }

    initializeUI() {
        this.charts = createCharts();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        document.getElementById('startMonitoring').addEventListener('click', () => {
            this.startMonitoring();
        });

        document.getElementById('stopMonitoring').addEventListener('click', () => {
            this.stopMonitoring();
        });

        document.getElementById('historyMetric').addEventListener('change', (e) => {
            this.updateHistoryChart(e.target.value);
        });

        document.getElementById('historyPeriod').addEventListener('change', (e) => {
            this.updateHistoryPeriod(e.target.value);
        });
    }

    connectWebSocket() {
        this.ws = new WebSocket(`ws://${window.location.host}`);

        this.ws.onopen = () => {
            console.log('Connected to dashboard server');
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from dashboard server');
            setTimeout(() => this.connectWebSocket(), 5000);
        };
    }

    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'init':
                this.handleInitialData(message.data);
                break;
            case 'realtimeUpdate':
                this.handleRealtimeUpdate(message.data);
                break;
            case 'alert':
                this.handleAlert(message.data);
                break;
            case 'sessionStarted':
                this.handleSessionStart(message.sessionId);
                break;
            case 'sessionEnded':
                this.handleSessionEnd(message.sessionId, message.report);
                break;
        }
    }

    handleInitialData(data) {
        this.data = data;
        this.updateAllCharts();
        this.updateMetrics();
    }

    handleRealtimeUpdate(data) {
        // Update time series data
        this.data.cpu.push(...data.cpu);
        this.data.memory.push(...data.memory);
        this.data.load.push(...data.load);

        // Maintain fixed window of data points
        const maxPoints = 100;
        if (this.data.cpu.length > maxPoints) {
            this.data.cpu = this.data.cpu.slice(-maxPoints);
            this.data.memory = this.data.memory.slice(-maxPoints);
            this.data.load = this.data.load.slice(-maxPoints);
        }

        this.updateAllCharts();
        this.updateMetrics();
    }

    handleAlert(alert) {
        this.data.alerts.unshift(alert);
        if (this.data.alerts.length > 50) {
            this.data.alerts.pop();
        }
        this.updateAlerts();
    }

    handleSessionStart(sessionId) {
        this.sessionId = sessionId;
        document.getElementById('startMonitoring').disabled = true;
        document.getElementById('stopMonitoring').disabled = false;
    }

    handleSessionEnd(sessionId, report) {
        if (sessionId === this.sessionId) {
            this.sessionId = null;
            document.getElementById('startMonitoring').disabled = false;
            document.getElementById('stopMonitoring').disabled = true;
        }
    }

    startMonitoring() {
        const sessionId = Date.now().toString();
        this.ws.send(JSON.stringify({
            type: 'startMonitoring',
            sessionId
        }));
    }

    stopMonitoring() {
        if (this.sessionId) {
            this.ws.send(JSON.stringify({
                type: 'stopMonitoring',
                sessionId: this.sessionId
            }));
        }
    }

    updateAllCharts() {
        // Update real-time charts
        this.charts.cpu.data.datasets[0].data = this.data.cpu.map(d => ({
            x: d.timestamp,
            y: d.value
        }));
        this.charts.cpu.update('quiet');

        this.charts.memory.data.datasets[0].data = this.data.memory.map(d => ({
            x: d.timestamp,
            y: d.value
        }));
        this.charts.memory.update('quiet');

        this.charts.load.data.datasets[0].data = this.data.load.map(d => ({
            x: d.timestamp,
            y: d.value
        }));
        this.charts.load.update('quiet');

        // Update history chart based on current selection
        const metric = document.getElementById('historyMetric').value;
        this.updateHistoryChart(metric);
    }

    updateMetrics() {
        if (this.data.cpu.length > 0) {
            const lastCpu = this.data.cpu[this.data.cpu.length - 1].value;
            document.getElementById('cpuCurrent').textContent = `${formatNumber(lastCpu)}%`;
            document.getElementById('cpuAvg').textContent = 
                `${formatNumber(this.calculateAverage(this.data.cpu.map(d => d.value)))}%`;
            document.getElementById('cpuPeak').textContent = 
                `${formatNumber(Math.max(...this.data.cpu.map(d => d.value)))}%`;
        }

        if (this.data.memory.length > 0) {
            const lastMem = this.data.memory[this.data.memory.length - 1].value;
            document.getElementById('memCurrent').textContent = formatBytes(lastMem);
            document.getElementById('memAvailable').textContent = 
                formatBytes(process.memoryUsage().heapTotal - lastMem);
            document.getElementById('memPeak').textContent = 
                formatBytes(Math.max(...this.data.memory.map(d => d.value)));
        }

        if (this.data.load.length > 0) {
            const lastLoad = this.data.load[this.data.load.length - 1].value;
            document.getElementById('loadCurrent').textContent = formatNumber(lastLoad);
            document.getElementById('loadAvg').textContent = 
                formatNumber(this.calculateAverage(this.data.load.map(d => d.value)));
            document.getElementById('loadTrend').textContent = 
                this.calculateTrend(this.data.load.map(d => d.value));
        }
    }

    updateAlerts() {
        const alertsList = document.getElementById('alertsList');
        alertsList.innerHTML = this.data.alerts
            .map(alert => `
                <div class="alert-item alert-${alert.level} fade-in">
                    <div class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</div>
                    <div class="alert-message">${alert.message}</div>
                </div>
            `)
            .join('');
    }

    calculateAverage(values) {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateTrend(values) {
        if (values.length < 2) return 'stable';
        const recent = values.slice(-10);
        const avg = this.calculateAverage(recent);
        const first = recent[0];
        const last = recent[recent.length - 1];
        const change = ((last - first) / first) * 100;

        if (Math.abs(change) < 5) return 'stable';
        return change > 0 ? 'increasing' : 'decreasing';
    }

    startAutoRefresh() {
        setInterval(() => {
            this.charts.cpu.update('quiet');
            this.charts.memory.update('quiet');
            this.charts.load.update('quiet');
        }, 1000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});