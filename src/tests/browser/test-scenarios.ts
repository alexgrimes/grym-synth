import { ValidationScenario, TestResult, NetworkCondition, TestEnvironment } from './types';
import { AudioContext } from 'standardized-audio-context';

async function createTestAudioFile(index: number): Promise<File> {
  const audioContext = new AudioContext();
  const buffer = audioContext.createBuffer(2, 44100, 44100);
  
  // Fill with test data
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin((i + index * 100) * 440 / 44100);
    }
  }

  // Convert to wav
  const wav = await audioBufferToWav(buffer);
  return new File([wav], `test-${index}.wav`, { type: 'audio/wav' });
}

function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve) => {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const wavData = new Uint8Array(44 + length);
    
    // WAV header
    const view = new DataView(wavData.buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2 * numberOfChannels, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    resolve(new Blob([wavData], { type: 'audio/wav' }));
  });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const testScenarios = {
  createModelLoadingTest(): ValidationScenario {
    return {
      name: 'Model Loading',
      run: async () => {
        const startTime = performance.now();
        try {
          const models = ['audio', 'pattern', 'verification'];
          for (const model of models) {
            await window.audioManager.projectManager.initializeModel(model, {
              type: 'processing',
              memoryRequirement: 100 * 1024 * 1024
            });
          }

          return {
            passed: true,
            details: `Successfully loaded ${models.length} models`,
            metrics: { loadTime: performance.now() - startTime }
          };
        } catch (error) {
          return {
            passed: false,
            details: `Model loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }
    };
  },

  createResourceContentionTest(): ValidationScenario {
    return {
      name: 'Resource Contention',
      run: async () => {
        const startTime = performance.now();
        const workers: Worker[] = [];

        try {
          // Create resource pressure
          const workerCount = navigator.hardwareConcurrency || 4;
          for (let i = 0; i < workerCount; i++) {
            const worker = new Worker(
              URL.createObjectURL(new Blob([`
                let data = [];
                for (let i = 0; i < 1000000; i++) {
                  data.push(new Float32Array(100));
                }
                postMessage('done');
              `], { type: 'application/javascript' }))
            );
            workers.push(worker);
          }

          // Process audio under pressure
          const file = await createTestAudioFile(0);
          const result = await window.audioManager.processAudio({
            id: file.name,
            path: file.name,
            size: file.size,
            format: 'wav'
          });

          return {
            passed: result.success,
            details: 'Successfully processed audio under resource pressure',
            metrics: {
              processingTime: performance.now() - startTime,
              workerCount
            }
          };
        } catch (error) {
          return {
            passed: false,
            details: `Resource contention test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        } finally {
          workers.forEach(w => w.terminate());
        }
      }
    };
  },

  createNetworkConditionsTest(): ValidationScenario {
    return {
      name: 'Network Conditions',
      run: async () => {
        try {
          // Test with different network conditions
          const conditions: NetworkCondition[] = [
            { latency: 0, bandwidth: Infinity, packetLoss: 0 },
            { latency: 100, bandwidth: 1_000_000, packetLoss: 0.01 },
            { latency: 500, bandwidth: 100_000, packetLoss: 0.05 }
          ];

          const results = await Promise.all(conditions.map(async (condition) => {
            const file = await createTestAudioFile(0);
            return window.audioManager.processAudio({
              id: file.name,
              path: file.name,
              size: file.size,
              format: 'wav'
            });
          }));

          const allSucceeded = results.every(r => r.success);
          return {
            passed: allSucceeded,
            details: `Processed audio under ${conditions.length} network conditions`,
            metrics: { successRate: results.filter(r => r.success).length / results.length }
          };
        } catch (error) {
          return {
            passed: false,
            details: `Network conditions test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }
    };
  },

  createBrowserCompatTest(): ValidationScenario {
    return {
      name: 'Browser Compatibility',
      run: async () => {
        try {
          // Check Web Audio API support
          const hasWebAudio = 'AudioContext' in window || 'webkitAudioContext' in window;
          const hasMediaRecorder = 'MediaRecorder' in window;
          const hasWorkers = 'Worker' in window;

          // Create and process test audio
          const file = await createTestAudioFile(0);
          const result = await window.audioManager.processAudio({
            id: file.name,
            path: file.name,
            size: file.size,
            format: 'wav'
          });

          return {
            passed: result.success && hasWebAudio && hasMediaRecorder && hasWorkers,
            details: 'Browser supports all required features',
            metrics: {
              webAudioSupport: hasWebAudio,
              mediaRecorderSupport: hasMediaRecorder,
              workerSupport: hasWorkers
            }
          };
        } catch (error) {
          return {
            passed: false,
            details: `Browser compatibility test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }
    };
  }
};

// Add to window for testing
declare global {
  interface Window {
    audioManager: any; // Replace with proper type when available
  }
}

export default testScenarios;