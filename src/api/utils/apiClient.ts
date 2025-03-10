import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from './responseTypes';

// Extend the Axios request config to include metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
    [key: string]: any;
  };
}

// Environment-specific API URLs
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
const API_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000; // 30 seconds default

// API client configuration
interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

// Request logging interface
interface RequestLogEntry {
  url: string;
  method: string;
  timestamp: string;
  requestData?: any;
  requestId: string;
}

// Response logging interface
interface ResponseLogEntry extends RequestLogEntry {
  status: number;
  responseData?: any;
  duration: number;
}

/**
 * API Client for handling all HTTP requests to backend services
 * Provides consistent error handling, logging, and response formatting
 */
class ApiClient {
  private axiosInstance: AxiosInstance;
  private requestLogs: RequestLogEntry[] = [];
  private responseLogs: ResponseLogEntry[] = [];
  private maxLogEntries = 100;

  constructor(config: ApiClientConfig = {}) {
    this.axiosInstance = axios.create({
      baseURL: config.baseURL || API_BASE_URL,
      timeout: config.timeout || API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.headers,
      },
      withCredentials: config.withCredentials ?? true, // Enable cookies by default
    });

    this.setupInterceptors();
  }

  /**
   * Configure request and response interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Generate a unique request ID
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        config.headers['X-Request-ID'] = requestId;

        // Log the request
        this.logRequest({
          url: `${config.baseURL}${config.url}`,
          method: config.method?.toUpperCase() || 'GET',
          timestamp: new Date().toISOString(),
          requestData: config.data,
          requestId,
        });

        // Add timestamp to track request duration
        (config as ExtendedAxiosRequestConfig).metadata = { startTime: Date.now() };

        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Calculate request duration
        const startTime = ((response.config as ExtendedAxiosRequestConfig).metadata?.startTime) || Date.now();
        const duration = Date.now() - startTime;

        // Log the response
        this.logResponse({
          url: response.config.url || '',
          method: response.config.method?.toUpperCase() || 'GET',
          timestamp: new Date().toISOString(),
          requestData: response.config.data,
          requestId: response.config.headers['X-Request-ID'] as string,
          status: response.status,
          responseData: response.data,
          duration,
        });

        return response;
      },
      (error: AxiosError) => {
        // Calculate request duration even for errors
        const startTime = ((error.config as ExtendedAxiosRequestConfig)?.metadata?.startTime) || Date.now();
        const duration = Date.now() - startTime;

        // Log the error response
        if (error.config) {
          this.logResponse({
            url: error.config.url || '',
            method: error.config.method?.toUpperCase() || 'GET',
            timestamp: new Date().toISOString(),
            requestData: error.config.data,
            requestId: error.config.headers?.['X-Request-ID'] as string || 'unknown',
            status: error.response?.status || 0,
            responseData: error.response?.data,
            duration,
          });
        }

        // Format error for consistent handling
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Process API errors into a consistent format
   */
  private handleApiError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with an error status code
      const status = error.response.status;
      const data = error.response.data as any;

      // Create a standardized error message
      const errorMessage = data.error || data.message || `API Error: ${status}`;

      // Create a custom error with additional context
      const apiError = new Error(errorMessage);
      (apiError as any).status = status;
      (apiError as any).data = data;
      (apiError as any).requestId = error.config?.headers?.['X-Request-ID'];

      // Log detailed error information
      console.error(`API Error (${status}):`, {
        message: errorMessage,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        requestId: error.config?.headers?.['X-Request-ID'],
        data: error.response.data,
      });

      return apiError;
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error('Network Error:', error.message);
      const networkError = new Error(`Network Error: ${error.message}`);
      (networkError as any).isNetworkError = true;
      return networkError;
    } else {
      // Error in setting up the request
      console.error('Request Setup Error:', error.message);
      return new Error(`Request Error: ${error.message}`);
    }
  }

  /**
   * Log API request details
   */
  private logRequest(entry: RequestLogEntry): void {
    this.requestLogs.unshift(entry);

    // Limit log size
    if (this.requestLogs.length > this.maxLogEntries) {
      this.requestLogs.pop();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${entry.method} ${entry.url}`, {
        requestId: entry.requestId,
        data: entry.requestData,
      });
    }
  }

  /**
   * Log API response details
   */
  private logResponse(entry: ResponseLogEntry): void {
    this.responseLogs.unshift(entry);

    // Limit log size
    if (this.responseLogs.length > this.maxLogEntries) {
      this.responseLogs.pop();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${entry.status} ${entry.method} ${entry.url}`, {
        requestId: entry.requestId,
        duration: `${entry.duration}ms`,
        data: entry.responseData,
      });
    }
  }

  /**
   * Get recent request logs
   */
  public getRequestLogs(): RequestLogEntry[] {
    return [...this.requestLogs];
  }

  /**
   * Get recent response logs
   */
  public getResponseLogs(): ResponseLogEntry[] {
    return [...this.responseLogs];
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.requestLogs = [];
    this.responseLogs = [];
  }

  /**
   * Set authentication token for subsequent requests
   */
  public setAuthToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  public clearAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  /**
   * Generic request method with type safety
   */
  public async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.request<ApiResponse<T>>(config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * GET request with type safety
   */
  public async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * POST request with type safety
   */
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * PUT request with type safety
   */
  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * PATCH request with type safety
   */
  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * DELETE request with type safety
   */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload file with progress tracking
   */
  public async uploadFile<T>(
    url: string,
    file: File,
    onProgress?: (percentage: number) => void,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    // Add any additional data to the form
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentage);
          }
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;

// Also export the class for custom instances
export { ApiClient };
