import { z } from 'zod';
import { NormalizedResourceSchema } from '../core';
import type { Page, Resource, SiteAdapter } from '../core';

export class JuceAdapter implements SiteAdapter {
  private readonly baseUrl = 'https://juce.com/learn/documentation';
  
  canHandle(url: string): boolean {
    return url.startsWith(this.baseUrl);
  }

  async extract(page: Page): Promise<Resource> {
    const rawContent = await page.content();
    let extractedContent = 'Failed to process content';

    try {
      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          model: 'deepseek-r1:14b',
          prompt: `Extract key JUCE learning resources from:\n${rawContent}`,
          stream: false
        })
      });

      if (!response.ok) throw new Error(`Ollama Error: ${response.status}`);
      
      const result = await response.json();
      extractedContent = result.response || '';
    } catch (error) {
      console.error('Content processing failed:', error);
    }

    return {
      url: page.url(),
      title: await page.title(),
      content: extractedContent,
      metadata: {
        version: await this.extractVersion(page),
        sections: await this.extractSections(page)
      }
    };
  }

  private async extractVersion(page: Page): Promise<string> {
    try {
      const version = await page.locator('.version-info').textContent();
      return version?.trim() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async extractSections(page: Page): Promise<string[]> {
    try {
      const sections = await page.locator('.documentation-section').allTextContents();
      return sections.map(s => s.trim());
    } catch {
      return [];
    }
  }
}
