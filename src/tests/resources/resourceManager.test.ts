import { ResourceManager, Resource } from '../../resources/resourceManager';
import { promises as fs } from 'fs';
import path from 'path';

describe('ResourceManager Tests', () => {
  let resourceManager: ResourceManager;
  const testDbPath = ':memory:'; // Use in-memory SQLite for testing

  beforeEach(async () => {
    resourceManager = new ResourceManager(testDbPath);
    await resourceManager.initialize();
  });

  afterEach(async () => {
    await resourceManager.close();
  });

  test('should add and retrieve a resource', async () => {
    const testResource = {
      type: 'audio',
      path: '/test/audio.wav',
      metadata: {
        duration: 120,
        sampleRate: 44100
      }
    };

    const id = await resourceManager.addResource(testResource);
    expect(id).toBeTruthy();

    const retrieved = await resourceManager.getResource(id);
    expect(retrieved).toMatchObject({
      id,
      ...testResource
    });
  });

  test('should list resources by type', async () => {
    const audioResource = {
      type: 'audio',
      path: '/test/audio1.wav',
      metadata: { duration: 120 }
    };
    const imageResource = {
      type: 'image',
      path: '/test/image1.png',
      metadata: { width: 800, height: 600 }
    };

    await resourceManager.addResource(audioResource);
    await resourceManager.addResource(imageResource);

    const audioResources = await resourceManager.listResources('audio');
    expect(audioResources).toHaveLength(1);
    expect(audioResources[0]).toMatchObject(audioResource);

    const allResources = await resourceManager.listResources();
    expect(allResources).toHaveLength(2);
  });

  test('should update resource metadata', async () => {
    const originalResource = {
      type: 'audio',
      path: '/test/audio.wav',
      metadata: { duration: 120 }
    };

    const id = await resourceManager.addResource(originalResource);
    const updates = {
      metadata: { duration: 150, sampleRate: 48000 }
    };

    const updated = await resourceManager.updateResource(id, updates);
    expect(updated).toBe(true);

    const retrieved = await resourceManager.getResource(id);
    expect(retrieved?.metadata).toEqual(updates.metadata);
  });

  test('should delete a resource', async () => {
    const resource = {
      type: 'audio',
      path: '/test/audio.wav',
      metadata: { duration: 120 }
    };

    const id = await resourceManager.addResource(resource);
    const deleted = await resourceManager.deleteResource(id);
    expect(deleted).toBe(true);

    const retrieved = await resourceManager.getResource(id);
    expect(retrieved).toBeNull();
  });

  test('should handle non-existent resource operations gracefully', async () => {
    const nonExistentId = 'non-existent-id';

    const retrieved = await resourceManager.getResource(nonExistentId);
    expect(retrieved).toBeNull();

    const updated = await resourceManager.updateResource(nonExistentId, {
      metadata: { test: true }
    });
    expect(updated).toBe(false);

    const deleted = await resourceManager.deleteResource(nonExistentId);
    expect(deleted).toBe(false);
  });
});
