import { initDB } from './db';
import { Resource } from './types';
import fs from 'fs/promises';
import path from 'path';

export async function exportResources(outputDir: string) {
  const db = await initDB();
  const resources = await db.getAll('resources');
  
  const jsonl = resources
    .map((resource: Resource) => JSON.stringify({
      prompt: resource.content,
      completion: resource.summary,
      metadata: {
        type: resource.type,
        difficulty: resource.metadata.difficulty,
        tags: resource.metadata.tags || [],
      }
    }))
    .join('\n');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'resources.jsonl'),
    jsonl
  );
}