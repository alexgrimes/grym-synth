import { z } from 'zod';
import type { Page, ExtractOptions } from '@browserbasehq/stagehand';
import crypto from 'crypto';

export type { Page, ExtractOptions };

export interface Resource {
  url: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface SiteAdapter {
  canHandle(url: string): boolean;
  extract(page: Page): Promise<Resource>;
}

export function normalizeResources(resources: Resource[]): NormalizedResource[] {
  return resources.map(resource => ({
    id: crypto.randomUUID(),
    source: new URL(resource.url).hostname,
    type: 'documentation',
    title: resource.title,
    description: resource.content.slice(0, 200),
    content: resource.content,
    tags: [],
    url: resource.url,
    publishedAt: new Date(),
    author: 'unknown',
    language: 'en'
  }));
}

export const NormalizedResourceSchema = z.object({
  id: z.string().uuid(),
  source: z.string(),
  type: z.enum(['tutorial', 'documentation', 'video', 'book']),
  title: z.string(),
  description: z.string(),
  content: z.string().default(''),
  tags: z.array(z.string()),
  url: z.string().url(),
  publishedAt: z.date().optional(),
  author: z.string().optional(),
  language: z.string().default('en'),
});

export type NormalizedResource = z.infer<typeof NormalizedResourceSchema>;

export const SearchResultSchema = z.object({
  query: z.string(),
  results: z.array(NormalizedResourceSchema),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export interface ExtractionConfig {
  maxDepth: number;
  parallelRequests: number;
  timeout: number;
  allowedDomains: string[];
}
