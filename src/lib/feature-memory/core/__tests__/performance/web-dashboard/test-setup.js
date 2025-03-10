// Mock browser APIs
global.WebSocket = require('mock-socket').WebSocket;
global.setInterval = jest.fn();
global.clearInterval = jest.fn();
global.requestAnimationFrame = jest.fn();

// Mock Chart.js
jest.mock('chart.js', () => ({
    Chart: jest.fn().mockImplementation(() => ({
        data: { datasets: [{ data: [] }] },
        update: jest.fn(),
        destroy: jest.fn()
    }))
}));

// Mock DOM APIs
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    }))
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
};