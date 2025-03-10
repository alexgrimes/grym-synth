/**
 * Qwen2-Audio model quantization options
 */
export const enum Qwen2Quantization {
  Q4_K_M = 'q4_K_M',   // Default edge-optimized (4.2GB)
  Q4_0 = 'q4_0',       // Smaller size (3.8GB)
  Q5_K_M = 'q5_K_M'    // Higher quality (4.8GB)
}

/**
 * Memory requirements for a specific quantization level
 */
export interface QuantizationRequirements {
  /** RAM needed in bytes */
  ramNeeded: number;
  
  /** Optimization type */
  type: 'edge_optimized' | 'quality_optimized';
  
  /** Minimum free memory required for operation */
  minFreeMemory: number;
}

/**
 * Result of memory status check
 */
export interface MemoryStatus {
  /** Current memory status */
  status: 'ok' | 'warning' | 'critical';
  
  /** Available memory in bytes */
  availableMemory: number;
  
  /** Warning message if status is not 'ok' */
  warning?: string;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  /** Available memory in bytes */
  available: number;
  
  /** Total system memory in bytes */
  total: number;
  
  /** Used memory in bytes */
  used: number;
  
  /** Percentage of memory used */
  percentUsed: number;
  
  /** Percentage of memory free */
  percentFree: number;
  
  /** Whether a model is currently loaded */
  modelLoaded: boolean;
  
  /** Current quantization level if model is loaded */
  currentQuantization: Qwen2Quantization | null;
  
  /** Model requirements if model is loaded */
  modelRequirements?: QuantizationRequirements;
}