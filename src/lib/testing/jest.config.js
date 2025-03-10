/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '<rootDir>/src/lib/testing/__tests__/**/*.test.ts'
  ],
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/lib/testing/setup/jest.setup.ts'
  ],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage/test-infrastructure'
};