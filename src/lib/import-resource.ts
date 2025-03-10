import { Resource } from '@shared/types';
import { processResource } from './process-resource';
import { initDB } from './db';

export async function importResource(resource: Resource) {
  const db = await initDB();
  
  try {
    // Process resource through Ollama
    const processed = await processResource(resource);
    
    // Store in IndexedDB
    await db.put('resources', {
      ...resource,
      summary: processed.response,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Resource import failed:', error);
    return false;
  }
}