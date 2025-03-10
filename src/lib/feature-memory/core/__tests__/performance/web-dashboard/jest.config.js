module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/public/js/__tests__'],
    moduleFileExtensions: ['js', 'ts', 'jsx', 'tsx', 'json', 'node'],
    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 85,
            lines: 85,
            statements: 85
        }
    },
    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/__tests__/**/*.integration.test.js'
    ],
    setupFiles: ['<rootDir>/test-setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/public/js/$1'
    },
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/'
    ],
    verbose: true,
    testTimeout: 10000,
    maxWorkers: '50%'
};