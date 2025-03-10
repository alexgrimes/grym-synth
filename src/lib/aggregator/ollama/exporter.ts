import { NormalizedResource } from '../core';
import fs from 'fs';
import path from 'path';

export class OllamaExporter {
  constructor(private outputDir: string) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  async export(resources: NormalizedResource[], filename: string): Promise<void> {
    const filePath = path.join(this.outputDir, filename);
    const lines = resources.map(resource => 
      JSON.stringify({
        id: resource.id,
        content: this.formatContent(resource),
        metadata: {
          source: resource.source,
          type: resource.type,
          tags: resource.tags,
          url: resource.url
        }
      })
    ).join('\n');

    return fs.promises.writeFile(filePath, lines);
  }

  private formatContent(resource: NormalizedResource): string {
    return `Title: ${resource.title}\n\n` +
      `Description: ${resource.description}\n\n` +
      `Content: ${resource.content}\n\n` +
      `Published: ${resource.publishedAt?.toISOString() || 'unknown'}\n` +
      `Author: ${resource.author || 'unknown'}\n` +
      `Language: ${resource.language}`;
  }
}
