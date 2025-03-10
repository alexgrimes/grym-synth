import apiClient from './utils/apiClient';
import {
  ApiResponse,
  AnalysisParams,
  Pattern,
  PatternResult
} from './utils/responseTypes';

/**
 * Pattern Recognition API
 * Handles interactions with audio analysis and pattern recognition services
 */
class PatternRecognitionApi {
  private baseUrl = '/pattern-recognition';

  /**
   * Analyze audio to identify patterns and structures
   *
   * @param audioId - ID of the audio to analyze
   * @param params - Analysis parameters (techniques, resolution, etc.)
   * @returns Promise with the analysis result
   */
  public async analyzeAudio(
    audioId: string,
    params: AnalysisParams
  ): Promise<ApiResponse<PatternResult>> {
    try {
      // Prepare request data
      const requestData = {
        audioId,
        ...params
      };

      // Make API request
      return await apiClient.post<PatternResult>(
        `${this.baseUrl}/analyze`,
        requestData
      );
    } catch (error) {
      console.error('Error analyzing audio:', error);
      throw error;
    }
  }

  /**
   * Get patterns identified in a previously analyzed audio
   *
   * @param audioId - ID of the analyzed audio
   * @returns Promise with array of identified patterns
   */
  public async getPatterns(
    audioId: string
  ): Promise<ApiResponse<Pattern[]>> {
    try {
      return await apiClient.get<Pattern[]>(
        `${this.baseUrl}/patterns/${audioId}`
      );
    } catch (error) {
      console.error('Error fetching patterns:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific pattern
   *
   * @param patternId - ID of the pattern
   * @returns Promise with detailed pattern information
   */
  public async getPatternDetails(
    patternId: string
  ): Promise<ApiResponse<Pattern>> {
    try {
      return await apiClient.get<Pattern>(
        `${this.baseUrl}/pattern/${patternId}`
      );
    } catch (error) {
      console.error('Error fetching pattern details:', error);
      throw error;
    }
  }

  /**
   * Get a list of available analysis techniques
   *
   * @returns Promise with array of available techniques and their descriptions
   */
  public async getAnalysisTechniques(): Promise<ApiResponse<{
    id: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
  }[]>> {
    try {
      return await apiClient.get(
        `${this.baseUrl}/techniques`
      );
    } catch (error) {
      console.error('Error fetching analysis techniques:', error);
      throw error;
    }
  }

  /**
   * Compare patterns between multiple audio samples
   *
   * @param audioIds - Array of audio IDs to compare
   * @param params - Comparison parameters
   * @returns Promise with comparison results
   */
  public async comparePatterns(
    audioIds: string[],
    params: {
      techniques?: string[];
      focusAreas?: string[];
      [key: string]: any;
    } = {}
  ): Promise<ApiResponse<{
    similarities: Record<string, number>;
    commonPatterns: Pattern[];
    uniquePatterns: Record<string, Pattern[]>;
  }>> {
    try {
      return await apiClient.post(
        `${this.baseUrl}/compare`,
        {
          audioIds,
          ...params
        }
      );
    } catch (error) {
      console.error('Error comparing patterns:', error);
      throw error;
    }
  }

  /**
   * Get analysis history for a specific audio
   *
   * @param audioId - ID of the audio
   * @returns Promise with array of previous analyses
   */
  public async getAnalysisHistory(
    audioId: string
  ): Promise<ApiResponse<{
    analysisId: string;
    timestamp: string;
    techniques: string[];
    patternCount: number;
  }[]>> {
    try {
      return await apiClient.get(
        `${this.baseUrl}/history/${audioId}`
      );
    } catch (error) {
      console.error('Error fetching analysis history:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const patternRecognitionApi = new PatternRecognitionApi();
export default patternRecognitionApi;
