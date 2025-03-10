/**
 * API Tests for grym-synth Backend Integration
 *
 * This file contains comprehensive tests for all API endpoints to ensure
 * they are functioning correctly, handling errors appropriately, and
 * returning the expected responses.
 *
 * Note: This is a template file that demonstrates the structure and approach
 * for API testing. When implementing, you'll need to properly type the mock
 * responses and ensure TypeScript compatibility.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Import API modules
import {
  audioGeneration,
  patternRecognition,
  parameterMapping,
  modelManagement,
  midiGeneration,
} from '../../api';

// Import API client
import apiRequest from '../../api/utils/apiClient';

// Mock the API client
jest.mock('../../api/utils/apiClient');

describe('API Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Audio Generation API', () => {
    test('generateAudio should create a new audio generation job', async () => {
      // Setup mock response
      const mockResponse = {
        audioId: 'audio-123',
        url: 'http://example.com/audio/audio-123.wav',
        duration: 5,
        format: 'wav',
        createdAt: new Date().toISOString(),
        prompt: 'test prompt',
        parameters: {
          duration: 5,
          model: 'test-model'
        }
      };

      // Configure mock
      (apiRequest.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Execute the function
      const result = await audioGeneration.generateAudio('test prompt', {
        duration: 5,
        model: 'test-model'
      });

      // Verify API was called correctly
      expect(apiRequest.post).toHaveBeenCalledWith('/audio/generate', {
        prompt: 'test prompt',
        duration: 5,
        model: 'test-model'
      });

      // Verify result
      expect(result).toEqual(mockResponse);
    });

    test('getGenerationStatus should return job status', async () => {
      // Setup mock response
      const mockResponse = {
        jobId: 'job-123',
        status: 'processing',
        progress: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Configure mock
      (apiRequest.get as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Execute the function
      const result = await audioGeneration.getGenerationStatus('job-123');

      // Verify API was called correctly
      expect(apiRequest.get).toHaveBeenCalledWith('/audio/jobs/job-123');

      // Verify result
      expect(result).toEqual(mockResponse);
    });

    test('should handle API errors gracefully', async () => {
      // Configure mock to throw error
      (apiRequest.post as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      // Verify error is propagated
      await expect(audioGeneration.generateAudio('test prompt'))
        .rejects
        .toThrow('API Error');
    });
  });

  describe('Pattern Recognition API', () => {
    test('analyzeAudio should analyze audio and return patterns', async () => {
      // Setup mock response
      const mockResponse = {
        analysisId: 'analysis-123',
        audioId: 'audio-123',
        patterns: [
          {
            id: 'pattern-1',
            type: 'rhythm',
            confidence: 0.9,
            features: {
              tempo: 120,
              complexity: 0.7
            }
          }
        ],
        metadata: {
          duration: 5
        },
        createdAt: new Date().toISOString()
      };

      // Configure mock
      (apiRequest.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Execute the function with test parameters
      const result = await patternRecognition.analyzeAudio('audio-123', {
        sensitivity: 0.8
      });

      // Verify API was called correctly
      expect(apiRequest.post).toHaveBeenCalledWith('/patterns/analyze', {
        audioId: 'audio-123',
        sensitivity: 0.8
      });

      // Verify result
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Parameter Mapping API', () => {
    test('getAllParameterMaps should return all parameter maps', async () => {
      // Setup mock response
      const mockResponse = [
        {
          id: 'map-1',
          name: 'Test Map 1',
          rules: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'map-2',
          name: 'Test Map 2',
          rules: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // Configure mock
      (apiRequest.get as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Execute the function
      const result = await parameterMapping.getAllParameterMaps();

      // Verify API was called correctly
      expect(apiRequest.get).toHaveBeenCalledWith('/parameters/maps');

      // Verify result
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Model Management API', () => {
    test('checkModels should return available models', async () => {
      // Setup mock response
      const mockResponse = [
        {
          id: 'model-1',
          name: 'Test Model 1',
          version: '1.0.0',
          type: 'GAMA',
          status: 'available',
          size: 1000000,
          capabilities: ['audio_generation']
        },
        {
          id: 'model-2',
          name: 'Test Model 2',
          version: '1.0.0',
          type: 'AudioLDM',
          status: 'available',
          size: 2000000,
          capabilities: ['audio_generation']
        }
      ];

      // Configure mock
      (apiRequest.get as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Execute the function
      const result = await modelManagement.checkModels();

      // Verify API was called correctly
      expect(apiRequest.get).toHaveBeenCalledWith('/models');

      // Verify result
      expect(result).toEqual(mockResponse);
    });
  });

  describe('MIDI Generation API', () => {
    test('generateMIDI should create a new MIDI generation job', async () => {
      // Setup mock response
      const mockResponse = {
        midiId: 'midi-123',
        url: 'http://example.com/midi/midi-123.mid',
        createdAt: new Date().toISOString(),
        prompt: 'test midi prompt',
        parameters: {
          tempo: 120,
          key: 'C'
        }
      };

      // Configure mock
      (apiRequest.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Execute the function
      const result = await midiGeneration.generateMIDI('test midi prompt', {
        tempo: 120,
        key: 'C'
      });

      // Verify API was called correctly
      expect(apiRequest.post).toHaveBeenCalledWith('/midi/generate', {
        prompt: 'test midi prompt',
        tempo: 120,
        key: 'C'
      });

      // Verify result
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      // Configure mock to throw network error
      (apiRequest.get as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

      // Verify error is propagated
      await expect(audioGeneration.getGenerationStatus('job-123'))
        .rejects
        .toThrow('Network Error');
    });

    test('should handle timeout errors', async () => {
      // Configure mock to throw timeout error
      (apiRequest.get as jest.Mock).mockRejectedValueOnce(new Error('Timeout Error'));

      // Verify error is propagated
      await expect(audioGeneration.getGenerationStatus('job-123'))
        .rejects
        .toThrow('Timeout Error');
    });

    test('should handle authentication errors', async () => {
      // Configure mock to throw authentication error
      (apiRequest.get as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

      // Verify error is propagated
      await expect(audioGeneration.getGenerationStatus('job-123'))
        .rejects
        .toThrow('Unauthorized');
    });
  });
});

