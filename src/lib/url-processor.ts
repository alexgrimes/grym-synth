import { load } from 'cheerio';
import type { Resource, ResourceSubmission } from './types';
import { nanoid } from 'nanoid';
import config from '../../stagehand.config';

interface ExtractedContent {
  title: string;
  content: string;
  metadata: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime?: string;
  };
}

export class UrlProcessor {
  private static removeUnwantedElements(html: string): string {
    const $ = load(html);
    config.extraction.removeSelectors.forEach(selector => {
      $(selector).remove();
    });
    return $.html();
  }

  private static extractContent(html: string): ExtractedContent {
    const $ = load(html);
    const selectors = config.selectors.article;
    
    const title = $(selectors.title).first().text().trim();
    const content = $(selectors.content).text().trim();
    
    const metadata: ExtractedContent['metadata'] = {};
    
    const difficultyText = $(selectors.difficulty).text().trim().toLowerCase();
    if (difficultyText) {
      metadata.difficulty = (difficultyText === 'advanced' ? 'advanced' :
                           difficultyText === 'intermediate' ? 'intermediate' : 
                           'beginner') as Resource['metadata']['difficulty'];
    }
    metadata.estimatedTime = $(selectors.duration).text().trim();

    return { title, content, metadata };
  }

  private static sanitizeContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim();
  }

  static async processUrl(url: string, metadata: ResourceSubmission['metadata']): Promise<Resource> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const html = await response.text();
      const cleanHtml = this.removeUnwantedElements(html);
      const extracted = this.extractContent(cleanHtml);
      const sanitizedContent = this.sanitizeContent(extracted.content);

      const resource: Resource = {
        id: nanoid(),
        url,
        title: extracted.title || 'Untitled Resource',
        content: sanitizedContent,
        summary: '', // Will be filled by LLM
        type: 'tutorial',
        category: 'dsp',
        metadata: {
          ...metadata,
          difficulty: (extracted.metadata.difficulty || metadata.difficulty || 'beginner') as Resource['metadata']['difficulty'],
          topics: metadata.topics,
          estimatedTime: extracted.metadata.estimatedTime || metadata.estimatedTime,
        },
        dateAdded: Date.now(),
        lastAccessed: Date.now(),
      };

      return resource;
    } catch (error: unknown) {
      console.error('Error processing URL:', error);
      throw new Error(`Failed to process URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async summarizeContent(content: string, llmManager: any): Promise<string> {
    try {
      const prompt = `Summarize the following content in a concise way, focusing on the main points and key takeaways:\n\n${content}`;
      const summary = await llmManager.generateResponse(prompt);
      return summary;
    } catch (error: unknown) {
      console.error('Error generating summary:', error);
      return '';
    }
  }
}
