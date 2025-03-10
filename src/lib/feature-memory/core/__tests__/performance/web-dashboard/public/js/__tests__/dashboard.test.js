/**
 * @jest-environment jsdom
 */

import { Dashboard } from '../dashboard';
import { Chart } from 'chart.js';

// Mock Chart.js
jest.mock('chart.js', () => {
    return {
        Chart: jest.fn().mockImplementation(() => ({
            data: { datasets: [{ data: [] }] },
            update: jest.fn(),
            destroy: jest.fn()
        }))
    };
});

// Mock WebSocket
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = WebSocket.OPEN;
        setTimeout(() => this.onopen(), 0);
    }
    send = jest.fn();
    close = jest.fn();
}

global.WebSocket = MockWebSocket;

describe('Dashboard', () => {
    let dashboard;
    let mockChartInstance;

    beforeEach(() => {
        // Setup DOM elements required by Dashboard
        document.body.innerHTML = `
            <div id="cpuChart"></div>
            <div id="memoryChart"></div>
            <div id="loadChart"></div>
            <div id="historyChart"></div>
            <div id="alertsList"></div>
            <div id="violationsList"></div>
            <button id="startMonitoring"></button>
            <button id="stopMonitoring"></button>
            <select id="historyMetric"></select>
            <select id="historyPeriod"></select>
        `;

        jest.useFakeTimers();
        dashboard = new Dashboard();
        mockChartInstance = Chart.mock.results[0].value;
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('WebSocket Communication', () => {
        it('establishes connection on initialization', () => {
            expect(dashboard.ws).toBeTruthy();
            expect(dashboard.ws instanceof MockWebSocket).toBeTruthy();
        });

        it('handles initial data message', () => {
            const initialData = {
                type: 'init',
                data: {
                    realtime: {
                        cpu: [],
                        memory: [],
                        load: []
                    },
                    historical: {
                        daily: [],
                        weekly: {
                            cpu: [],
                            memory: [],
                            load: [],
                            violations: 0
                        }
                    },
                    alerts: []
                }
            };

            dashboard.ws.onmessage({ data: JSON.stringify(initialData) });
            expect(mockChartInstance.update).toHaveBeenCalled();
        });

        it('handles realtime updates', () => {
            const update = {
                type: 'realtimeUpdate',
                data: {
                    cpu: [{ timestamp: Date.now(), value: 50 }],
                    memory: [{ timestamp: Date.now(), value: 1024 }],
                    load: [{ timestamp: Date.now(), value: 1.5 }]
                }
            };

            dashboard.ws.onmessage({ data: JSON.stringify(update) });
            expect(mockChartInstance.update).toHaveBeenCalled();
        });

        it('handles alerts', () => {
            const alert = {
                type: 'alert',
                data: {
                    level: 'warning',
                    message: 'High CPU usage',
                    timestamp: Date.now()
                }
            };

            dashboard.ws.onmessage({ data: JSON.stringify(alert) });
            const alertsList = document.getElementById('alertsList');
            expect(alertsList.innerHTML).toContain('High CPU usage');
        });
    });

    describe('Monitoring Controls', () => {
        it('starts monitoring session', () => {
            const startButton = document.getElementById('startMonitoring');
            startButton.click();

            expect(dashboard.ws.send).toHaveBeenCalledWith(
                expect.stringContaining('startMonitoring')
            );
        });

        it('stops monitoring session', () => {
            const stopButton = document.getElementById('stopMonitoring');
            dashboard.sessionId = 'test-session';
            stopButton.click();

            expect(dashboard.ws.send).toHaveBeenCalledWith(
                expect.stringContaining('stopMonitoring')
            );
        });
    });

    describe('Chart Updates', () => {
        it('updates charts with new data', () => {
            const data = {
                cpu: [{ timestamp: Date.now(), value: 50 }],
                memory: [{ timestamp: Date.now(), value: 1024 }],
                load: [{ timestamp: Date.now(), value: 1.5 }]
            };

            dashboard.updateAllCharts(data);
            expect(mockChartInstance.update).toHaveBeenCalled();
        });

        it('maintains maximum data points', () => {
            const timestamps = Array.from({ length: 1100 }, (_, i) => Date.now() + i * 1000);
            const values = timestamps.map(() => ({ timestamp: Date.now(), value: 50 }));

            dashboard.handleRealtimeUpdate({
                cpu: values,
                memory: values,
                load: values
            });

            expect(dashboard.data.cpu.length).toBeLessThanOrEqual(1000);
        });
    });

    describe('Alert Handling', () => {
        it('adds new alerts', () => {
            dashboard.addAlert('Test alert', 'warning');
            const alertsList = document.getElementById('alertsList');
            expect(alertsList.innerHTML).toContain('Test alert');
        });

        it('maintains maximum alerts', () => {
            for (let i = 0; i < 150; i++) {
                dashboard.addAlert(`Alert ${i}`, 'info');
            }
            expect(dashboard.data.alerts.length).toBeLessThanOrEqual(100);
        });
    });

    describe('Auto-refresh', () => {
        it('updates charts periodically', () => {
            jest.advanceTimersByTime(1000);
            expect(mockChartInstance.update).toHaveBeenCalled();
        });
    });

    describe('Cleanup', () => {
        it('cleans up resources on dispose', () => {
            dashboard.dispose();
            expect(dashboard.ws.close).toHaveBeenCalled();
            expect(mockChartInstance.destroy).toHaveBeenCalled();
        });
    });
});