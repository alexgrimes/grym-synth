import { storage } from '../storage';
import type { Resource } from '../types';
import natural from 'natural';
import Fuse from 'fuse.js';

export class SearchIndex {
  private index: Map<string, Set<string>> = new Map();
  private stemmer = natural.PorterStemmer;
  private fuseOptions = {
    includeScore: true,
    threshold: 0.3,
    keys: ['term']
  };

  async buildIndex() {
    const resources = await storage.getAllResources();
    
    resources.forEach(resource => {
      this.indexResource(resource);
    });
  }

  private indexResource(resource: ProcessedResource) {
    const terms = this.extractSearchTerms(resource);
    terms.forEach(term => {
      if (!this.index.has(term)) {
        this.index.set(term, new Set());
      }
      this.index.get(term)?.add(resource.id);
    });
  }

  private extractSearchTerms(resource: ProcessedResource): string[] {
    const terms = new Set<string>();
    
    // Index title words
    resource.title.toLowerCase().split(/\W+/).forEach(term => terms.add(term));
    
    // Index category and type
    terms.add(resource.category);
    terms.add(resource.type);
    
    // Index topics
    resource.metadata.topics.forEach(topic => terms.add(topic.toLowerCase()));
    
    return Array.from(terms);
  }

  search(query: string): string[] {
    const searchTerms = query.toLowerCase().split(/\W+/);
    const results = new Map<string, number>();

    searchTerms.forEach(term => {
      this.index.forEach((resourceIds, indexTerm) => {
        if (indexTerm.includes(term)) {
          resourceIds.forEach(id => {
            results.set(id, (results.get(id) || 0) + 1);
          });
        }
      });
    });

    return Array.from(results.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }
}