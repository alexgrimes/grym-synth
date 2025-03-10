/**
 * @jest-environment jsdom
 */

import { Dashboard } from '../../dashboard';
import { PatternStorage } from '../../../../pattern-storage';
import { PerformanceMonitor } from '../../../../monitor-utils';
import { PerformanceProfiler } from '../../../../profile-utils';

// Mock actual backend components
jest.mock('../../../../pattern-storage');
jest.mock('../../../../monitor-utils');
jest.mock('../../../../profile-utils');

describe('Dashboard Integration Tests', () => {
    let dashboard;
    let monitor;
    let profiler;
    let storage;
    let mockServer;

    beforeAll(() => {
        // Setup WebSocket mock server
        mockServer = new (require('mock-socket').Server)('ws://localhost:3000');
        mockServer.on('connection', socket => {
            socket.on('message', data => {
                const message = JSON.parse(data);
                handleServerMessage(socket, message);
            });
        });
    });

    beforeEach(() => {
        // Setup DOM
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

        // Initialize components
        storage = new PatternStorage();
        monitor = new PerformanceMonitor();
        profiler = new PerformanceProfiler();
        dashboard = new Dashboard();

        // Setup test data
        setupTestData();
    });

    afterEach(() => {
        dashboard.dispose();
        jest.clearAllMocks();
    });

    afterAll(() => {
        mockServer.close();
    });

    function setupTestData() {
        const now = Date.now();
        const testData = {
            cpu: Array.from({ length: 100 }, (_, i) => ({
                timestamp: now + i * 1000,
                value: Math.random() * 100
            })),
            memory: Array.from({ length: 100 }, (_, i) => ({
                timestamp: now + i * 1000,
                value: Math.random() * 1024 * 1024 * 1024
            })),
            load: Array.from({ length: 100 }, (_, i) => ({
                timestamp: now + i * 1000,
                value: Math.random() * 10
            }))
        };

        monitor.setTestData(testData);
    }

    function handleServerMessage(socket, message) {
        switch (message.type) {
            case 'startMonitoring':
                socket.send(JSON.stringify({
                    type: 'sessionStarted',
                    sessionId: message.sessionId
                }));
                startSendingUpdates(socket);
                break;
            case 'stopMonitoring':
                socket.send(JSON.stringify({
                    type: 'sessionEnded',
                    sessionId: message.sessionId,
                    report: generateFinalReport()
                }));
                break;
        }
    }

    function startSendingUpdates(socket) {
        const interval = setInterval(() => {
            socket.send(JSON.stringify({
                type: 'realtimeUpdate',
                data: {
                    cpu: [{ timestamp: Date.now(), value: Math.random() * 100 }],
                    memory: [{ timestamp: Date.now(), value: Math.random() * 1024 * 1024 * 1024 }],
                    load: [{ timestamp: Date.now(), value: Math.random() * 10 }]
                }
            }));
        }, 1000);

        socket.on('close', () => clearInterval(interval));
    }

    function generateFinalReport() {
        return {
            duration: 60000,
            samples: 60,
            averages: {
                cpu: 45,
                memory: 512 * 1024 * 1024,
                load: 2.5
            },
            peaks: {
                cpu: 85,
                memory: 768 * 1024 * 1024,
                load: 5.0
            }
        };
    }

    describe('End-to-End Monitoring Session', () => {
        it('completes full monitoring cycle', async () => {
            // Start monitoring
            const startButton = document.getElementById('startMonitoring');
            startButton.click();

            // Wait for initial data
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(dashboard.sessionId).toBeTruthy();

            // Verify data updates
            const updates = [];
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                updates.push({
                    cpu: dashboard.data.cpu.length,
                    memory: dashboard.data.memory.length,
                    load: dashboard.data.load.length
                });
            }

            // Verify data accumulation
            expect(updates[4].cpu).toBeGreaterThan(updates[0].cpu);

            // Stop monitoring
            const stopButton = document.getElementById('stopMonitoring');
            stopButton.click();

            // Wait for final report
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(dashboard.sessionId).toBeNull();
        });

        it('handles network interruptions', async () => {
            // Start monitoring
            dashboard.startMonitoring();
            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate network interruption
            mockServer.simulate('error');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify reconnection attempt
            expect(dashboard.ws).toBeTruthy();
            expect(dashboard.ws.readyState).toBe(WebSocket.CONNECTING);
        });

        it('preserves historical data', async () => {
            // Start and collect some data
            dashboard.startMonitoring();
            await new Promise(resolve => setTimeout(resolve, 3000));
            const initialDataCount = dashboard.data.cpu.length;

            // Stop and restart
            dashboard.stopMonitoring();
            await new Promise(resolve => setTimeout(resolve, 100));
            dashboard.startMonitoring();
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify historical data preserved
            expect(dashboard.data.cpu.length).toBeGreaterThanOrEqual(initialDataCount);
        });
    });

    describe('Alert and Violation Handling', () => {
        it('processes and displays alerts', async () => {
            dashboard.startMonitoring();
            await new Promise(resolve => setTimeout(resolve, 100));

            mockServer.send(JSON.stringify({
                type: 'alert',
                data: {
                    level: 'warning',
                    message: 'High CPU usage detected',
                    timestamp: Date.now()
                }
            }));

            await new Promise(resolve => setTimeout(resolve, 100));
            const alertsList = document.getElementById('alertsList');
            expect(alertsList.innerHTML).toContain('High CPU usage detected');
        });

        it('tracks threshold violations', async () => {
            dashboard.startMonitoring();
            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate high CPU usage
            mockServer.send(JSON.stringify({
                type: 'realtimeUpdate',
                data: {
                    cpu: [{ timestamp: Date.now(), value: 95 }],
                    memory: [{ timestamp: Date.now(), value: 1024 * 1024 * 1024 }],
                    load: [{ timestamp: Date.now(), value: 8 }]
                }
            }));

            await new Promise(resolve => setTimeout(resolve, 100));
            const violationsList = document.getElementById('violationsList');
            expect(violationsList.innerHTML).toContain('CPU threshold exceeded');
        });
    });
});