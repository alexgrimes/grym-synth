/**
 * UAT Report Generator
 *
 * Generator for UAT reports
 */
import { Logger } from '../../utils/logger';
import { Scenario, ScenarioResult } from './scenario-runner';
import { FeedbackItem, FeedbackSummary } from './feedback-collector';
import * as fs from 'fs';
import * as path from 'path';

// Define report format
export enum ReportFormat {
  HTML = 'html',
  JSON = 'json',
  MARKDOWN = 'md',
  CSV = 'csv'
}

// Define report options
export interface ReportOptions {
  // Output format
  format: ReportFormat;

  // Output directory
  outputDir: string;

  // Report title
  title: string;

  // Include feedback
  includeFeedback?: boolean;

  // Include screenshots
  includeScreenshots?: boolean;

  // Include logs
  includeLogs?: boolean;

  // Include metrics
  includeMetrics?: boolean;

  // Include recommendations
  includeRecommendations?: boolean;
}

// Define report data
export interface ReportData {
  // Scenario results
  results: ScenarioResult[];

  // Feedback items
  feedback?: FeedbackItem[];

  // Feedback summaries
  feedbackSummaries?: FeedbackSummary[];

  // Screenshots
  screenshots?: {
    scenarioId: string;
    stepId: string;
    path: string;
  }[];

  // Logs
  logs?: {
    scenarioId: string;
    content: string;
  }[];

  // Metrics
  metrics?: {
    successRate: number;
    averageExecutionTimeMs: number;
    totalExecutionTimeMs: number;
    startTime: Date;
    endTime: Date;
  };
}

export class ReportGenerator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ namespace: 'report-generator' });
  }

  /**
   * Generate a report
   */
  async generateReport(
    data: ReportData,
    options: ReportOptions
  ): Promise<string> {
    this.logger.info(`Generating ${options.format} report: ${options.title}`);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    // Generate report based on format
    let reportContent: string;
    let reportFilename: string;

    switch (options.format) {
      case ReportFormat.HTML:
        reportContent = this.generateHtmlReport(data, options);
        reportFilename = `uat-report-${this.getTimestamp()}.html`;
        break;

      case ReportFormat.JSON:
        reportContent = this.generateJsonReport(data, options);
        reportFilename = `uat-report-${this.getTimestamp()}.json`;
        break;

      case ReportFormat.MARKDOWN:
        reportContent = this.generateMarkdownReport(data, options);
        reportFilename = `uat-report-${this.getTimestamp()}.md`;
        break;

      case ReportFormat.CSV:
        reportContent = this.generateCsvReport(data, options);
        reportFilename = `uat-report-${this.getTimestamp()}.csv`;
        break;

      default:
        throw new Error(`Unsupported report format: ${options.format}`);
    }

    // Write report to file
    const reportPath = path.join(options.outputDir, reportFilename);
    fs.writeFileSync(reportPath, reportContent);

    this.logger.info(`Report generated: ${reportPath}`);

    return reportPath;
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(
    data: ReportData,
    options: ReportOptions
  ): string {
    // Calculate summary metrics
    const successfulScenarios = data.results.filter(result => result.success).length;
    const totalScenarios = data.results.length;
    const successRate = (successfulScenarios / totalScenarios) * 100;

    const totalSteps = data.results.reduce(
      (sum, result) => sum + result.stepResults.length,
      0
    );

    const successfulSteps = data.results.reduce(
      (sum, result) => sum + result.stepResults.filter(step => step.success).length,
      0
    );

    const stepSuccessRate = (successfulSteps / totalSteps) * 100;

    const totalDuration = data.results.reduce(
      (sum, result) => sum + result.totalDurationMs,
      0
    );

    const averageDuration = totalDuration / totalScenarios;

    // Generate HTML
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4 {
      color: #0066cc;
    }
    .summary {
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 20px;
    }
    .metric {
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      flex: 1;
      min-width: 200px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metric h3 {
      margin-top: 0;
      font-size: 16px;
    }
    .metric p {
      font-size: 24px;
      font-weight: bold;
      margin: 10px 0 0;
    }
    .scenario {
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .scenario-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .scenario-title {
      margin: 0;
    }
    .scenario-status {
      padding: 5px 10px;
      border-radius: 3px;
      font-weight: bold;
    }
    .success {
      background-color: #d4edda;
      color: #155724;
    }
    .failure {
      background-color: #f8d7da;
      color: #721c24;
    }
    .step {
      border-left: 3px solid #ddd;
      padding-left: 15px;
      margin-bottom: 15px;
    }
    .step-success {
      border-left-color: #28a745;
    }
    .step-failure {
      border-left-color: #dc3545;
    }
    .step-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .step-name {
      font-weight: bold;
      margin: 0;
    }
    .step-duration {
      color: #666;
      font-size: 14px;
    }
    .feedback-section {
      margin-top: 40px;
    }
    .feedback-summary {
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .rating-distribution {
      display: flex;
      margin: 15px 0;
    }
    .rating-bar {
      height: 20px;
      margin-right: 2px;
    }
    .rating-5 { background-color: #28a745; }
    .rating-4 { background-color: #5cb85c; }
    .rating-3 { background-color: #ffc107; }
    .rating-2 { background-color: #fd7e14; }
    .rating-1 { background-color: #dc3545; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
    }
    .recommendations {
      background-color: #e6f7ff;
      border: 1px solid #91d5ff;
      border-radius: 5px;
      padding: 20px;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <h1>${options.title}</h1>
  <div class="summary">
    <h2>Summary</h2>
    <div class="metrics">
      <div class="metric">
        <h3>Scenarios</h3>
        <p>${successfulScenarios}/${totalScenarios} (${successRate.toFixed(2)}%)</p>
      </div>
      <div class="metric">
        <h3>Steps</h3>
        <p>${successfulSteps}/${totalSteps} (${stepSuccessRate.toFixed(2)}%)</p>
      </div>
      <div class="metric">
        <h3>Average Duration</h3>
        <p>${this.formatDuration(averageDuration)}</p>
      </div>
      <div class="metric">
        <h3>Total Duration</h3>
        <p>${this.formatDuration(totalDuration)}</p>
      </div>
    </div>
  </div>

  <h2>Scenarios</h2>
`;

    // Add scenarios
    data.results.forEach(result => {
      const successClass = result.success ? 'success' : 'failure';
      const statusText = result.success ? 'PASSED' : 'FAILED';

      html += `
  <div class="scenario">
    <div class="scenario-header">
      <h3 class="scenario-title">${result.scenarioName}</h3>
      <span class="scenario-status ${successClass}">${statusText}</span>
    </div>
    <p><strong>Duration:</strong> ${this.formatDuration(result.totalDurationMs)}</p>
    <p><strong>Start Time:</strong> ${result.startTime.toLocaleString()}</p>
    <p><strong>End Time:</strong> ${result.endTime.toLocaleString()}</p>

    <h4>Steps</h4>
`;

      // Add steps
      result.stepResults.forEach(step => {
        const stepClass = step.success ? 'step-success' : 'step-failure';

        html += `
    <div class="step ${stepClass}">
      <div class="step-header">
        <h5 class="step-name">${step.name}</h5>
        <span class="step-duration">${this.formatDuration(step.durationMs)}</span>
      </div>
      ${step.error ? `<p class="step-error">Error: ${step.error}</p>` : ''}
      ${step.notes && step.notes.length > 0 ? `<p class="step-notes">Notes: ${step.notes.join(', ')}</p>` : ''}
    </div>
`;
      });

      html += `
  </div>
`;
    });

    // Add feedback if available
    if (options.includeFeedback && data.feedbackSummaries && data.feedbackSummaries.length > 0) {
      html += `
  <div class="feedback-section">
    <h2>User Feedback</h2>
`;

      data.feedbackSummaries.forEach(summary => {
        // Calculate max rating count for scaling
        const maxRatingCount = Math.max(
          ...Object.values(summary.ratingDistribution)
        );

        html += `
    <div class="feedback-summary">
      <h3>${summary.scenarioName}</h3>
      <p><strong>Average Rating:</strong> ${summary.averageRating.toFixed(2)}/5</p>
      <p><strong>Total Feedback:</strong> ${summary.totalFeedback}</p>

      <h4>Rating Distribution</h4>
      <div class="rating-distribution">
`;

        // Add rating bars
        for (let rating = 5; rating >= 1; rating--) {
          const feedbackRating = rating as unknown as keyof typeof summary.ratingDistribution;
          const count = summary.ratingDistribution[feedbackRating];
          const percentage = maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0;

          html += `
        <div class="rating-bar rating-${rating}" style="width: ${percentage}%" title="${rating} stars: ${count}"></div>
`;
        }

        html += `
      </div>

      <h4>Step Feedback</h4>
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Average Rating</th>
            <th>Feedback Count</th>
          </tr>
        </thead>
        <tbody>
`;

        summary.stepFeedback.forEach(step => {
          html += `
          <tr>
            <td>${step.stepName}</td>
            <td>${step.averageRating.toFixed(2)}/5</td>
            <td>${step.feedbackCount}</td>
          </tr>
`;
        });

        html += `
        </tbody>
      </table>

      <h4>Common Themes</h4>
      <ul>
`;

        summary.commonThemes.forEach(theme => {
          const sentimentClass = theme.sentiment === 'positive' ? 'success' : (theme.sentiment === 'negative' ? 'failure' : '');

          html += `
        <li class="${sentimentClass}">${theme.theme} (${theme.count} mentions)</li>
`;
        });

        html += `
      </ul>

      <h4>Improvement Suggestions</h4>
      <ul>
`;

        summary.improvementSuggestions.forEach(suggestion => {
          html += `
        <li>${suggestion}</li>
`;
        });

        html += `
      </ul>
    </div>
`;
      });

      html += `
  </div>
`;
    }

    // Add recommendations if enabled
    if (options.includeRecommendations) {
      const recommendations = this.generateRecommendations(data);

      if (recommendations.length > 0) {
        html += `
  <div class="recommendations">
    <h2>Recommendations</h2>
    <ul>
`;

        recommendations.forEach(recommendation => {
          html += `
      <li>${recommendation}</li>
`;
        });

        html += `
    </ul>
  </div>
`;
      }
    }

    html += `
</body>
</html>
`;

    return html;
  }

  /**
   * Generate JSON report
   */
  private generateJsonReport(
    data: ReportData,
    options: ReportOptions
  ): string {
    // Create JSON structure
    const jsonData = {
      title: options.title,
      timestamp: new Date().toISOString(),
      summary: {
        totalScenarios: data.results.length,
        successfulScenarios: data.results.filter(result => result.success).length,
        totalSteps: data.results.reduce(
          (sum, result) => sum + result.stepResults.length,
          0
        ),
        successfulSteps: data.results.reduce(
          (sum, result) => sum + result.stepResults.filter(step => step.success).length,
          0
        ),
        totalDurationMs: data.results.reduce(
          (sum, result) => sum + result.totalDurationMs,
          0
        )
      },
      scenarios: data.results.map(result => ({
        id: result.scenarioId,
        name: result.scenarioName,
        success: result.success,
        durationMs: result.totalDurationMs,
        startTime: result.startTime.toISOString(),
        endTime: result.endTime.toISOString(),
        steps: result.stepResults.map(step => ({
          name: step.name,
          success: step.success,
          durationMs: step.durationMs,
          error: step.error,
          notes: step.notes
        })),
        error: result.error?.message
      })),
      feedback: options.includeFeedback && data.feedbackSummaries ? data.feedbackSummaries : undefined,
      metrics: options.includeMetrics ? data.metrics : undefined,
      recommendations: options.includeRecommendations ? this.generateRecommendations(data) : undefined
    };

    return JSON.stringify(jsonData, null, 2);
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(
    data: ReportData,
    options: ReportOptions
  ): string {
    // Calculate summary metrics
    const successfulScenarios = data.results.filter(result => result.success).length;
    const totalScenarios = data.results.length;
    const successRate = (successfulScenarios / totalScenarios) * 100;

    const totalSteps = data.results.reduce(
      (sum, result) => sum + result.stepResults.length,
      0
    );

    const successfulSteps = data.results.reduce(
      (sum, result) => sum + result.stepResults.filter(step => step.success).length,
      0
    );

    const stepSuccessRate = (successfulSteps / totalSteps) * 100;

    const totalDuration = data.results.reduce(
      (sum, result) => sum + result.totalDurationMs,
      0
    );

    const averageDuration = totalDuration / totalScenarios;

    // Generate Markdown
    let markdown = `# ${options.title}\n\n`;

    // Add summary
    markdown += `## Summary\n\n`;
    markdown += `- **Scenarios**: ${successfulScenarios}/${totalScenarios} (${successRate.toFixed(2)}%)\n`;
    markdown += `- **Steps**: ${successfulSteps}/${totalSteps} (${stepSuccessRate.toFixed(2)}%)\n`;
    markdown += `- **Average Duration**: ${this.formatDuration(averageDuration)}\n`;
    markdown += `- **Total Duration**: ${this.formatDuration(totalDuration)}\n\n`;

    // Add scenarios
    markdown += `## Scenarios\n\n`;

    data.results.forEach(result => {
      const statusEmoji = result.success ? '✅' : '❌';

      markdown += `### ${statusEmoji} ${result.scenarioName}\n\n`;
      markdown += `- **Status**: ${result.success ? 'PASSED' : 'FAILED'}\n`;
      markdown += `- **Duration**: ${this.formatDuration(result.totalDurationMs)}\n`;
      markdown += `- **Start Time**: ${result.startTime.toLocaleString()}\n`;
      markdown += `- **End Time**: ${result.endTime.toLocaleString()}\n\n`;

      if (result.error) {
        markdown += `**Error**: ${result.error.message}\n\n`;
      }

      // Add steps
      markdown += `#### Steps\n\n`;

      result.stepResults.forEach(step => {
        const stepEmoji = step.success ? '✅' : '❌';

        markdown += `- ${stepEmoji} **${step.name}** (${this.formatDuration(step.durationMs)})\n`;

        if (step.error) {
          markdown += `  - Error: ${step.error}\n`;
        }

        if (step.notes && step.notes.length > 0) {
          markdown += `  - Notes: ${step.notes.join(', ')}\n`;
        }
      });

      markdown += `\n`;
    });

    // Add feedback if available
    if (options.includeFeedback && data.feedbackSummaries && data.feedbackSummaries.length > 0) {
      markdown += `## User Feedback\n\n`;

      data.feedbackSummaries.forEach(summary => {
        markdown += `### ${summary.scenarioName}\n\n`;
        markdown += `- **Average Rating**: ${summary.averageRating.toFixed(2)}/5\n`;
        markdown += `- **Total Feedback**: ${summary.totalFeedback}\n\n`;

        // Add rating distribution
        markdown += `#### Rating Distribution\n\n`;
        markdown += `| Rating | Count |\n`;
        markdown += `| ------ | ----- |\n`;
for (let rating = 5; rating >= 1; rating--) {
  const feedbackRating = rating as unknown as keyof typeof summary.ratingDistribution;
  markdown += `| ${rating} stars | ${summary.ratingDistribution[feedbackRating]} |\n`;
          markdown += `| ${rating} stars | ${summary.ratingDistribution[rating]} |\n`;
        }

        markdown += `\n`;

        // Add step feedback
        if (summary.stepFeedback.length > 0) {
          markdown += `#### Step Feedback\n\n`;
          markdown += `| Step | Average Rating | Feedback Count |\n`;
          markdown += `| ---- | -------------- | -------------- |\n`;

          summary.stepFeedback.forEach(step => {
            markdown += `| ${step.stepName} | ${step.averageRating.toFixed(2)}/5 | ${step.feedbackCount} |\n`;
          });

          markdown += `\n`;
        }

        // Add common themes
        if (summary.commonThemes.length > 0) {
          markdown += `#### Common Themes\n\n`;

          summary.commonThemes.forEach(theme => {
            const sentiment = theme.sentiment === 'positive' ? '👍' : (theme.sentiment === 'negative' ? '👎' : '');
            markdown += `- ${sentiment} ${theme.theme} (${theme.count} mentions)\n`;
          });

          markdown += `\n`;
        }

        // Add improvement suggestions
        if (summary.improvementSuggestions.length > 0) {
          markdown += `#### Improvement Suggestions\n\n`;

          summary.improvementSuggestions.forEach(suggestion => {
            markdown += `- ${suggestion}\n`;
          });

          markdown += `\n`;
        }
      });
    }

    // Add recommendations if enabled
    if (options.includeRecommendations) {
      const recommendations = this.generateRecommendations(data);

      if (recommendations.length > 0) {
        markdown += `## Recommendations\n\n`;

        recommendations.forEach(recommendation => {
          markdown += `- ${recommendation}\n`;
        });

        markdown += `\n`;
      }
    }

    return markdown;
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(
    data: ReportData,
    options: ReportOptions
  ): string {
    // Generate CSV for scenarios
    let csv = 'Scenario ID,Scenario Name,Status,Duration (ms),Start Time,End Time,Error\n';

    data.results.forEach(result => {
      const status = result.success ? 'PASSED' : 'FAILED';
      const error = result.error ? result.error.message.replace(/,/g, ';') : '';

      csv += `${result.scenarioId},${result.scenarioName},${status},${result.totalDurationMs},${result.startTime.toISOString()},${result.endTime.toISOString()},${error}\n`;
    });

    // Generate CSV for steps
    csv += '\nScenario ID,Step Name,Status,Duration (ms),Error,Notes\n';

    data.results.forEach(result => {
      result.stepResults.forEach(step => {
        const status = step.success ? 'PASSED' : 'FAILED';
        const error = step.error ? step.error.replace(/,/g, ';') : '';
        const notes = step.notes ? step.notes.join('; ').replace(/,/g, ';') : '';

        csv += `${result.scenarioId},${step.name},${status},${step.durationMs},${error},${notes}\n`;
      });
    });

    // Add feedback if available
    if (options.includeFeedback && data.feedback && data.feedback.length > 0) {
      csv += '\nUser ID,Scenario ID,Step ID,Rating,Comments,Timestamp\n';

      data.feedback.forEach(item => {
        const comments = item.comments ? item.comments.replace(/,/g, ';') : '';

        csv += `${item.userId},${item.scenarioId},${item.stepId || ''},${item.rating},${comments},${item.timestamp.toISOString()}\n`;
      });
    }

    return csv;
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(data: ReportData): string[] {
    const recommendations: string[] = [];

    // Calculate metrics
    const successfulScenarios = data.results.filter(result => result.success).length;
    const totalScenarios = data.results.length;
    const successRate = (successfulScenarios / totalScenarios) * 100;

    // Identify failed scenarios
    const failedScenarios = data.results.filter(result => !result.success);

    // Identify common failure points
    const failedSteps = new Map<string, number>();

    data.results.forEach(result => {
      result.stepResults
        .filter(step => !step.success)
        .forEach(step => {
          const count = failedSteps.get(step.name) || 0;
          failedSteps.set(step.name, count + 1);
        });
    });

    // Sort failed steps by frequency
    const sortedFailedSteps = Array.from(failedSteps.entries())
      .sort((a, b) => b[1] - a[1]);

    // Generate recommendations
    if (successRate < 80) {
      recommendations.push(`Improve overall test success rate (currently ${successRate.toFixed(2)}%). Target: >90%`);
    }

    if (sortedFailedSteps.length > 0) {
      const topFailedSteps = sortedFailedSteps.slice(0, 3);

      topFailedSteps.forEach(([stepName, count]) => {
        recommendations.push(`Fix issues with step "${stepName}" which failed ${count} times`);
      });
    }

    if (failedScenarios.length > 0) {
      const criticalFailures = failedScenarios
        .filter(result => {
          // Identify critical scenarios based on naming conventions
          // This is a simplified approach - in a real system you would have more robust criteria
          const name = result.scenarioName.toLowerCase();
          return (
            name.includes('critical') ||
            name.includes('essential') ||
            name.includes('core')
          );
        });

      if (criticalFailures.length > 0) {
        recommendations.push(`Prioritize fixing ${criticalFailures.length} failed critical scenarios`);
      }
    }

    // Add feedback-based recommendations
    if (data.feedbackSummaries && data.feedbackSummaries.length > 0) {
      const lowRatedScenarios = data.feedbackSummaries
        .filter(summary => summary.averageRating < 3)
        .sort((a, b) => a.averageRating - b.averageRating);

      if (lowRatedScenarios.length > 0) {
        const worstScenario = lowRatedScenarios[0];
        recommendations.push(`Improve user experience for scenario "${worstScenario.scenarioName}" (rated ${worstScenario.averageRating.toFixed(2)}/5)`);
      }

      // Collect common negative themes
      const negativeThemes = data.feedbackSummaries
        .flatMap(summary => summary.commonThemes)
        .filter(theme => theme.sentiment === 'negative')
        .sort((a, b) => b.count - a.count);

      if (negativeThemes.length > 0) {
        const topNegativeTheme = negativeThemes[0];
        recommendations.push(`Address common user complaint: "${topNegativeTheme.theme}" (${topNegativeTheme.count} mentions)`);
      }
    }

    return recommendations;
  }

  /**
   * Format duration in milliseconds to a human-readable string
   */
  private formatDuration(durationMs: number): string {
    if (durationMs < 1000) {
      return `${durationMs.toFixed(0)}ms`;
    }

    if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(2)}s`;
    }

    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(2);

    return `${minutes}m ${seconds}s`;
  }

  /**
   * Get timestamp string for filenames
   */
  private getTimestamp(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }
}
