import apiClient from './utils/apiClient';
import {
  ApiResponse,
  ModelStatus,
  DownloadStatus,
  ModelInfo
} from './utils/responseTypes';

/**
 * Model Management API
 * Handles interactions with model management services for checking,
 * downloading, and managing AI models (GAMA, AudioLDM, XenakisLDM)
 */
class ModelManagementApi {
  private baseUrl = '/model-management';

  /**
   * Check the status of all available models
   *
   * @returns Promise with array of model statuses
   */
  public async checkModels(): Promise<ApiResponse<ModelStatus[]>> {
    try {
      return await apiClient.get<ModelStatus[]>(
        `${this.baseUrl}/status`
      );
    } catch (error) {
      console.error('Error checking model status:', error);
      throw error;
    }
  }

  /**
   * Download a specific model
   *
   * @param modelId - ID of the model to download
   * @returns Promise with download status
   */
  public async downloadModel(
    modelId: string
  ): Promise<ApiResponse<DownloadStatus>> {
    try {
      return await apiClient.post<DownloadStatus>(
        `${this.baseUrl}/download/${modelId}`
      );
    } catch (error) {
      console.error('Error downloading model:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific model
   *
   * @param modelId - ID of the model
   * @returns Promise with detailed model information
   */
  public async getModelInfo(
    modelId: string
  ): Promise<ApiResponse<ModelInfo>> {
    try {
      return await apiClient.get<ModelInfo>(
        `${this.baseUrl}/info/${modelId}`
      );
    } catch (error) {
      console.error('Error fetching model info:', error);
      throw error;
    }
  }

  /**
   * Check the download status of a model
   *
   * @param modelId - ID of the model
   * @returns Promise with current download status
   */
  public async checkDownloadStatus(
    modelId: string
  ): Promise<ApiResponse<DownloadStatus>> {
    try {
      return await apiClient.get<DownloadStatus>(
        `${this.baseUrl}/download-status/${modelId}`
      );
    } catch (error) {
      console.error('Error checking download status:', error);
      throw error;
    }
  }

  /**
   * Cancel an ongoing model download
   *
   * @param modelId - ID of the model being downloaded
   * @returns Promise with success status
   */
  public async cancelDownload(
    modelId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      return await apiClient.post(
        `${this.baseUrl}/cancel-download/${modelId}`
      );
    } catch (error) {
      console.error('Error cancelling download:', error);
      throw error;
    }
  }

  /**
   * Delete a downloaded model to free up space
   *
   * @param modelId - ID of the model to delete
   * @returns Promise with success status
   */
  public async deleteModel(
    modelId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      return await apiClient.delete(
        `${this.baseUrl}/model/${modelId}`
      );
    } catch (error) {
      console.error('Error deleting model:', error);
      throw error;
    }
  }

  /**
   * Update a model to the latest version
   *
   * @param modelId - ID of the model to update
   * @returns Promise with download status for the update
   */
  public async updateModel(
    modelId: string
  ): Promise<ApiResponse<DownloadStatus>> {
    try {
      return await apiClient.post<DownloadStatus>(
        `${this.baseUrl}/update/${modelId}`
      );
    } catch (error) {
      console.error('Error updating model:', error);
      throw error;
    }
  }

  /**
   * Get system requirements for all models
   *
   * @returns Promise with system requirements information
   */
  public async getSystemRequirements(): Promise<ApiResponse<{
    models: {
      id: string;
      name: string;
      minRAM: number;
      minVRAM?: number;
      minCPU?: string;
      minGPU?: string;
    }[];
    systemInfo: {
      availableRAM: number;
      availableVRAM?: number;
      cpu: string;
      gpu?: string;
    };
  }>> {
    try {
      return await apiClient.get(
        `${this.baseUrl}/system-requirements`
      );
    } catch (error) {
      console.error('Error fetching system requirements:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const modelManagementApi = new ModelManagementApi();
export default modelManagementApi;
