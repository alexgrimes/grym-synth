import { AudioBuffer, AudioPattern } from "./audio";

export interface FeatureAdapter {
  /**
   * Initialize the adapter with optional configuration
   */
  initialize(config?: any): Promise<boolean>;

  /**
   * Extract features from an audio buffer
   */
  extractFeatures(audioBuffer: AudioBuffer): Promise<Float32Array>;

  /**
   * Create an audio pattern from a region of audio
   */
  createPattern(
    audioBuffer: AudioBuffer,
    region: {
      startTime: number;
      endTime: number;
      frequencyRange: {
        low: number;
        high: number;
      };
    }
  ): Promise<AudioPattern>;

  /**
   * Compare two feature vectors and return a similarity score
   */
  compareFeatures(
    featuresA: Float32Array,
    featuresB: Float32Array
  ): Promise<number>;

  /**
   * Clean up any resources used by the adapter
   */
  dispose(): void;
}
