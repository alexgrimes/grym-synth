import { writeFileSync, unlinkSync } from 'fs';
import { generateReport, processJestOutput, TestReport } from '../generate-report';

describe('Report Generator', () => {
  const sampleOutput = {
    testResults: [
      {
        assertionResults: [
          {
            status: 'passed',
            title: 'handles resource exhaustion',
            duration: 100
          },
          {
            status: 'failed',
            title: 'handles stale resources',
            duration: 50,
            failureMessages: ['Resource not cleaned up']
          }
        ],
        startTime: 1000,
        endTime: 2000
      }
    ]
  };

  const tempJsonPath = 'temp-test-output.json';
  const tempHtmlPath = 'temp-test-report.html';

  beforeEach(() => {
    // Create temporary test output file
    writeFileSync(tempJsonPath, JSON.stringify(sampleOutput));
  });

  afterEach(() => {
    // Clean up temporary files
    try {
      unlinkSync(tempJsonPath);
      unlinkSync(tempHtmlPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('processJestOutput', () => {
    it('processes Jest output correctly', () => {
      const report = processJestOutput(tempJsonPath);

      expect(report.totalTests).toBe(2);
      expect(report.passed).toBe(1);
      expect(report.failed).toBe(1);
      expect(report.duration).toBe(1000);
    });

    it('handles test results', () => {
      const report = processJestOutput(tempJsonPath);

      expect(report.results).toHaveLength(2);
      expect(report.results[0]).toEqual({
        success: true,
        title: 'handles resource exhaustion',
        duration: 100,
        error: undefined
      });
      expect(report.results[1]).toEqual({
        success: false,
        title: 'handles stale resources',
        duration: 50,
        error: 'Resource not cleaned up'
      });
    });

    it('handles missing duration', () => {
      const outputWithoutDuration = {
        testResults: [
          {
            assertionResults: [
              {
                status: 'passed',
                title: 'test without duration'
              }
            ],
            startTime: 1000,
            endTime: 2000
          }
        ]
      };

      writeFileSync(tempJsonPath, JSON.stringify(outputWithoutDuration));
      const report = processJestOutput(tempJsonPath);

      expect(report.results[0].duration).toBe(0);
    });
  });

  describe('generateReport', () => {
    it('generates HTML report', () => {
      const report: TestReport = {
        timestamp: '2025-02-19T20:00:00.000Z',
        totalTests: 2,
        passed: 1,
        failed: 1,
        duration: 1000,
        results: [
          {
            success: true,
            title: 'passing test',
            duration: 100
          },
          {
            success: false,
            title: 'failing test',
            duration: 50,
            error: 'test failed'
          }
        ]
      };

      const html = generateReport(report);

      // Verify HTML content
      expect(html).toContain('Error Handling Test Report');
      expect(html).toContain('50%'); // Pass rate
      expect(html).toContain('passing test');
      expect(html).toContain('failing test');
      expect(html).toContain('test failed');
    });

    it('handles empty results', () => {
      const report: TestReport = {
        timestamp: '2025-02-19T20:00:00.000Z',
        totalTests: 0,
        passed: 0,
        failed: 0,
        duration: 0,
        results: []
      };

      const html = generateReport(report);

      expect(html).toContain('0%'); // Pass rate
      expect(html).toContain('Total Tests');
      expect(html).toContain('0'); // Test count
    });
  });
});