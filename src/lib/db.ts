import { openDB, DBSchema } from 'idb';
import { Resource, LocalNote } from './types';

interface AudioLearningDBSchema extends DBSchema {
  resources: {
    key: string;
    value: Resource;
    indexes: {
      'by-category': string;
      'by-difficulty': string;
    };
  };
  notes: {
    key: string;
    value: LocalNote;
    indexes: {
      'by-resource': string;
    };
  };
  progress: {
    key: string;
    value: {
      resourceId: string;
      completed: boolean;
      lastAccessed: number;
    };
    indexes: {
      'by-resource': string;
    };
  };
}

export const initDB = () => openDB<AudioLearningDBSchema>('audio-learning-hub', 1, {
  upgrade(db) {
    // Resources store
    const resourceStore = db.createObjectStore('resources', {
      keyPath: 'id'
    });
    resourceStore.createIndex('by-category', 'category');
    resourceStore.createIndex('by-difficulty', 'metadata.difficulty');

    // Notes store
    const noteStore = db.createObjectStore('notes', {
      keyPath: 'resourceId'
    });
    noteStore.createIndex('by-resource', 'resourceId');

    // Progress store
    const progressStore = db.createObjectStore('progress', {
      keyPath: 'resourceId'
    });
    progressStore.createIndex('by-resource', 'resourceId');
  }
});
