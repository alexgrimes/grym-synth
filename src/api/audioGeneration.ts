import apiClient from './utils/apiClient';
import {
  ApiResponse,
  AudioResult,
  GenerationParams,
  JobStatus,
  JobStatusResponse
} from './utils/responseTypes';

/**
 * Audio Generation API
 * Handles interactions with audio generation services (GAMA, AudioLDM, XenakisLDM)
 */
class AudioGenerationApi {
  private baseUrl = '/audio-generation';

  /**
   * Generate audio based on text prompt and parameters
   *
   * @param prompt - Text description of the audio to generate
   * @param params - Generation parameters (model, duration, etc.)
   * @returns Promise with the audio generation result or job ID for async generation
   */
  public async generateAudio(
    prompt: string,
    params: GenerationParams
  ): Promise<ApiResponse<AudioResult>> {
    try {
      // Determine which model to use
      const model = params.model || 'audioldm'; // Default to AudioLDM if not specified

      // Prepare request data
      const requestData = {
        prompt,
        ...params,
        model
      };

      // Make API request
      return await apiClient.post<AudioResult>(
        `${this.baseUrl}/generate`,
        requestData
      );
    } catch (error) {
      console.error('Error generating audio:', error);
      throw error;
    }
  }

  /**
   * Check the status of an ongoing audio generation job
   *
   * @param jobId - The ID of the generation job to check
   * @returns Promise with the current job status
   */
  public async getGenerationStatus(
    jobId: string
  ): Promise<ApiResponse<JobStatusResponse>> {
    try {
      return await apiClient.get<JobStatusResponse>(
        `${this.baseUrl}/status/${jobId}`
      );
    } catch (error) {
      console.error('Error checking generation status:', error);
      throw error;
    }
  }

  /**
   * Cancel an ongoing audio generation job
   *
   * @param jobId - The ID of the generation job to cancel
   * @returns Promise with boolean indicating success
   */
  public async cancelGeneration(
    jobId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      return await apiClient.post<boolean>(
        `${this.baseUrl}/cancel/${jobId}`
      );
    } catch (error) {
      console.error('Error cancelling generation:', error);
      throw error;
    }
  }

  /**
   * Get a list of all available audio generation models
   *
   * @returns Promise with array of available models and their capabilities
   */
  public async getAvailableModels(): Promise<ApiResponse<{
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    parameters: Record<string, any>;
  }[]>> {
    try {
      return await apiClient.get(`${this.baseUrl}/models`);
    } catch (error) {
      console.error('Error fetching available models:', error);
      throw error;
    }
  }

  /**
   * Get a list of recent audio generations
   *
   * @param limit - Maximum number of results to return
   * @returns Promise with array of recent audio generations
   */
  public async getRecentGenerations(
    limit: number = 10
  ): Promise<ApiResponse<AudioResult[]>> {
    try {
      return await apiClient.get<AudioResult[]>(
        `${this.baseUrl}/recent`,
        { limit }
      );
    } catch (error) {
      console.error('Error fetching recent generations:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific audio generation
   *
   * @param audioId - ID of the generated audio
   * @returns Promise with detailed audio information
   */
  public async getAudioDetails(
    audioId: string
  ): Promise<ApiResponse<AudioResult>> {
    try {
      return await apiClient.get<AudioResult>(
        `${this.baseUrl}/audio/${audioId}`
      );
    } catch (error) {
      console.error('Error fetching audio details:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const audioGenerationApi = new AudioGenerationApi();
export default audioGenerationApi;
