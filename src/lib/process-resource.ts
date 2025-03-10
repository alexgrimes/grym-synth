import { Resource } from '@shared/types';

export async function processResource(resource: Resource) {
  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource),
    });

    if (!response.ok) {
      throw new Error('Resource processing failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Resource processing error:', error);
    throw error;
  }
}