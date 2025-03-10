import { TestEnvironmentSetup } from '../setup-test-env';
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, rmdirSync, unlinkSync } from 'fs';
import { resolve } from 'path';

jest.mock('child_process');
const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;

describe('Test Environment Setup', () => {
  const testRoot = resolve(__dirname, '..');
  const coverageDir = resolve(testRoot, '../../../coverage');
  const tempDir = resolve(testRoot, 'temp-test-setup');
  
  let setup: TestEnvironmentSetup;

  beforeEach(() => {
    setup = new TestEnvironmentSetup();
    
    // Create temporary test directory
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Mock successful command execution
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      pid: 123,
      output: [],
      signal: null
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    
    // Clean up temporary files
    if (existsSync(tempDir)) {
      rmdirSync(tempDir, { recursive: true });
    }
  });

  describe('Directory Creation', () => {
    it('creates required directories', async () => {
      await setup.setup();

      const dirs = [
        coverageDir,
        resolve(coverageDir, 'test-infrastructure'),
        resolve(coverageDir, 'error-handling')
      ];

      dirs.forEach(dir => {
        expect(existsSync(dir)).toBe(true);
      });
    });

    it('handles existing directories', async () => {
      // Create directories first
      mkdirSync(coverageDir, { recursive: true });
      
      await setup.setup();
      
      expect(existsSync(coverageDir)).toBe(true);
    });
  });

  describe('Dependency Installation', () => {
    it('installs required packages', async () => {
      await setup.setup();

      expect(mockSpawnSync).toHaveBeenCalledWith(
        'npm',
        expect.arrayContaining(['install', '--save-dev']),
        expect.any(Object)
      );
    });

    it('handles installation failures', async () => {
      mockSpawnSync.mockReturnValueOnce({
        ...mockSpawnSync.mock.results[0].value,
        status: 1
      });

      const result = await setup.setup();
      expect(result).toBe(false);
    });
  });

  describe('Jest Configuration', () => {
    const jestConfigPath = resolve(testRoot, 'jest.config.js');

    afterEach(() => {
      if (existsSync(jestConfigPath)) {
        unlinkSync(jestConfigPath);
      }
    });

    it('creates Jest config if missing', async () => {
      await setup.setup();
      expect(existsSync(jestConfigPath)).toBe(true);
    });

    it('preserves existing Jest config', async () => {
      const originalContent = 'module.exports = {};';
      const configPath = resolve(tempDir, 'jest.config.js');
      
      // Create existing config
      mkdirSync(tempDir, { recursive: true });
      require('fs').writeFileSync(configPath, originalContent);

      await setup.setup();

      const content = require('fs').readFileSync(configPath, 'utf8');
      expect(content).toBe(originalContent);
    });
  });

  describe('Script Permissions', () => {
    it('makes scripts executable', async () => {
      await setup.setup();

      expect(mockSpawnSync).toHaveBeenCalledWith(
        'chmod',
        expect.arrayContaining(['+x']),
        expect.any(Object)
      );
    });
  });

  describe('Verification', () => {
    it('runs verification test', async () => {
      await setup.setup();

      expect(mockSpawnSync).toHaveBeenCalledWith(
        'npm',
        ['run', 'test:infra'],
        expect.any(Object)
      );
    });

    it('handles verification failure', async () => {
      mockSpawnSync.mockReturnValueOnce({
        ...mockSpawnSync.mock.results[0].value,
        status: 1
      });

      const result = await setup.setup();
      expect(result).toBe(false);
    });
  });

  describe('Full Setup', () => {
    it('completes all steps successfully', async () => {
      const result = await setup.setup();
      expect(result).toBe(true);
    });

    it('handles errors gracefully', async () => {
      // Simulate error in dependency installation
      mockSpawnSync.mockReturnValueOnce({
        ...mockSpawnSync.mock.results[0].value,
        status: 1
      });

      const result = await setup.setup();
      expect(result).toBe(false);
    });
  });
});