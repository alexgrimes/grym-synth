import type { Resource, NormalizedResource } from './core';
import { Browserbase } from '@browserbasehq/sdk';
import { OllamaExporter } from './ollama/exporter';
import path from 'path';
import crypto from 'crypto';

export class AggregatorService {
  private browserbase: Browserbase;
  private exporter: OllamaExporter;

  constructor() {
    this.browserbase = new Browserbase();
    // Set output directory to project root/output
    const outputDir = path.join(process.cwd(), 'output');
    this.exporter = new OllamaExporter(outputDir);
  }

  async processResource(url: string): Promise<NormalizedResource> {
    try {
      const rawResource = await this.browserbase.scrape(url);
      const normalizedResource: NormalizedResource = {
        id: crypto.randomUUID(),
        source: new URL(url).hostname,
        type: 'documentation',
        title: rawResource.title || 'Untitled',
        description: (rawResource.content || '').slice(0, 200),
        content: rawResource.content || '',
        tags: [],
        url: url,
        publishedAt: new Date(),
        author: 'unknown',
        language: 'en'
      };

      // Export to Ollama format
      await this.exporter.export([normalizedResource], 'resources.jsonl');

      return normalizedResource;
    } catch (error) {
      console.error('Error processing resource:', error);
      throw error;
    }
  }
}

export * from './core';
