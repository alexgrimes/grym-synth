import { nanoid } from 'nanoid';
import type { Resource, ResourceSubmission } from '../types';

export class ResourceProcessor {
  async processUrl(submission: ResourceSubmission): Promise<Resource> {
    try {
      // Fetch content from URL
      const response = await fetch(submission.url);
      const content = await response.text();

      // Process with local Ollama
      const analysis = await this.analyzeWithOllama(content);

      // Create resource object
      const resource: Resource = {
        id: nanoid(),
        url: submission.url,
        title: this.extractTitle(content),
        content,
        summary: analysis.summary,
        type: this.determineType(submission.url),
        categories: submission.categories,
        topics: submission.topics,
        dateAdded: Date.now(),
        lastAccessed: Date.now()
      };

      return resource;
    } catch (error) {
      console.error('Resource processing failed:', error);
      throw new Error('Failed to process resource');
    }
  }

  private async analyzeWithOllama(content: string) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-llm:14b',
          prompt: `Analyze this audio development resource and provide a summary:\n\n${content}`,
          stream: false
        })
      });

      const result = await response.json();
      return {
        summary: result.response || 'No summary available'
      };
    } catch (error) {
      console.error('Ollama analysis failed:', error);
      return {
        summary: 'Failed to analyze content'
      };
    }
  }

  private extractTitle(content: string): string {
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    return titleMatch?.[1] || 'Untitled Resource';
  }

  private determineType(url: string): Resource['type'] {
    if (url.includes('youtube.com')) return 'video';
    if (url.includes('/docs/') || url.includes('/documentation/')) return 'documentation';
    if (url.includes('/tutorial/') || url.includes('/learn/')) return 'tutorial';
    return 'documentation';
  }
}