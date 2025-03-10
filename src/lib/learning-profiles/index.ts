import { ModelLearningTracker } from './learning-tracker';
import { IndexedDBLearningProfileStorage } from './storage';
import type {
  ModelLearningProfile,
  LearningInteraction,
  ProfileUpdateResult,
  ModelSpecialization,
  MasteryLevel,
  ProfileVisualization
} from './types';

// Create a singleton instance of the storage
const storage = new IndexedDBLearningProfileStorage();

// Create a singleton instance of the learning tracker
const learningTracker = new ModelLearningTracker(storage);

/**
 * Initialize a new learning profile for a model
 */
export async function initializeProfile(
  modelId: string,
  specialization: ModelSpecialization
): Promise<ModelLearningProfile> {
  const profile: ModelLearningProfile = {
    modelId,
    specialization,
    learningState: {
      domains: new Map(),
      crossDomainConnections: new Map()
    },
    contextPreferences: {
      retentionPriority: [],
      summarizationThreshold: 1000, // Default token threshold
      specializedPrompts: new Map()
    }
  };

  await storage.saveProfile(profile);
  return profile;
}

/**
 * Record a new learning interaction for a model
 */
export async function recordInteraction(
  modelId: string,
  interaction: Omit<LearningInteraction, 'timestamp'>
): Promise<ProfileUpdateResult> {
  const fullInteraction: LearningInteraction = {
    ...interaction,
    timestamp: new Date()
  };

  return learningTracker.updateModelLearning(modelId, fullInteraction);
}

/**
 * Get a model's current understanding of a specific domain
 */
export async function getModelAnalysis(modelId: string, domain: string) {
  return learningTracker.getModelAnalysis(modelId, domain);
}

/**
 * Get a visualization of a model's learning profile
 */
export async function visualizeProfile(modelId: string): Promise<ProfileVisualization | null> {
  return learningTracker.visualizeProfile(modelId);
}

/**
 * List all available model profiles
 */
export async function listProfiles(): Promise<string[]> {
  return storage.listProfiles();
}

/**
 * Delete a model's learning profile and all associated data
 */
export async function deleteProfile(modelId: string): Promise<void> {
  return storage.deleteProfile(modelId);
}

/**
 * Export all learning profile data (useful for backup/migration)
 */
export async function exportLearningData() {
  return storage.exportData();
}

/**
 * Import learning profile data
 */
export async function importLearningData(data: Awaited<ReturnType<typeof exportLearningData>>) {
  return storage.importData(data);
}

// Re-export types for convenience
export type {
  ModelLearningProfile,
  LearningInteraction,
  ProfileUpdateResult,
  ModelSpecialization,
  MasteryLevel,
  ProfileVisualization
};