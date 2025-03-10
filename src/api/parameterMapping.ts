import apiClient from './utils/apiClient';
import {
  ApiResponse,
  MappingParams,
  ParameterMapping
} from './utils/responseTypes';

/**
 * Parameter Mapping API
 * Handles interactions with parameter mapping services that connect
 * audio patterns to synthesis parameters
 */
class ParameterMappingApi {
  private baseUrl = '/parameter-mapping';

  /**
   * Create a parameter mapping from audio patterns to synthesis parameters
   *
   * @param params - Mapping parameters
   * @returns Promise with the created parameter mapping
   */
  public async createMapping(
    params: MappingParams
  ): Promise<ApiResponse<ParameterMapping>> {
    try {
      return await apiClient.post<ParameterMapping>(
        `${this.baseUrl}/create`,
        params
      );
    } catch (error) {
      console.error('Error creating parameter mapping:', error);
      throw error;
    }
  }

  /**
   * Get a specific parameter mapping by ID
   *
   * @param mappingId - ID of the parameter mapping
   * @returns Promise with the parameter mapping
   */
  public async getMapping(
    mappingId: string
  ): Promise<ApiResponse<ParameterMapping>> {
    try {
      return await apiClient.get<ParameterMapping>(
        `${this.baseUrl}/mapping/${mappingId}`
      );
    } catch (error) {
      console.error('Error fetching parameter mapping:', error);
      throw error;
    }
  }

  /**
   * Update an existing parameter mapping
   *
   * @param mappingId - ID of the parameter mapping to update
   * @param params - New mapping parameters
   * @returns Promise with the updated parameter mapping
   */
  public async updateMapping(
    mappingId: string,
    params: Partial<MappingParams>
  ): Promise<ApiResponse<ParameterMapping>> {
    try {
      return await apiClient.put<ParameterMapping>(
        `${this.baseUrl}/mapping/${mappingId}`,
        params
      );
    } catch (error) {
      console.error('Error updating parameter mapping:', error);
      throw error;
    }
  }

  /**
   * Delete a parameter mapping
   *
   * @param mappingId - ID of the parameter mapping to delete
   * @returns Promise with success status
   */
  public async deleteMapping(
    mappingId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      return await apiClient.delete(
        `${this.baseUrl}/mapping/${mappingId}`
      );
    } catch (error) {
      console.error('Error deleting parameter mapping:', error);
      throw error;
    }
  }

  /**
   * Get all parameter mappings for a specific audio or pattern
   *
   * @param sourceType - Type of source ('audio' or 'pattern')
   * @param sourceId - ID of the source
   * @returns Promise with array of parameter mappings
   */
  public async getMappingsBySource(
    sourceType: 'audio' | 'pattern',
    sourceId: string
  ): Promise<ApiResponse<ParameterMapping[]>> {
    try {
      return await apiClient.get<ParameterMapping[]>(
        `${this.baseUrl}/mappings`,
        {
          sourceType,
          sourceId
        }
      );
    } catch (error) {
      console.error('Error fetching mappings by source:', error);
      throw error;
    }
  }

  /**
   * Get available mapping strategies
   *
   * @returns Promise with array of available mapping strategies
   */
  public async getMappingStrategies(): Promise<ApiResponse<{
    id: string;
    name: string;
    description: string;
    supportedSourceTypes: ('audio' | 'pattern' | 'manual')[];
    supportedTargetModels: string[];
    parameters: Record<string, any>;
  }[]>> {
    try {
      return await apiClient.get(
        `${this.baseUrl}/strategies`
      );
    } catch (error) {
      console.error('Error fetching mapping strategies:', error);
      throw error;
    }
  }

  /**
   * Apply a parameter mapping to generate synthesis parameters
   *
   * @param mappingId - ID of the parameter mapping to apply
   * @param options - Additional options for applying the mapping
   * @returns Promise with the generated synthesis parameters
   */
  public async applyMapping(
    mappingId: string,
    options: {
      variations?: number;
      constraintStrength?: number;
      [key: string]: any;
    } = {}
  ): Promise<ApiResponse<{
    parameters: Record<string, any>;
    variations?: Record<string, any>[];
  }>> {
    try {
      return await apiClient.post(
        `${this.baseUrl}/apply/${mappingId}`,
        options
      );
    } catch (error) {
      console.error('Error applying parameter mapping:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const parameterMappingApi = new ParameterMappingApi();
export default parameterMappingApi;
