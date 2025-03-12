import type { WasmPhysicsModule, PhysicsWorld } from './types';

// Dynamic import of WebAssembly module
let wasmModulePromise: Promise<WasmPhysicsModule>;
try {
  wasmModulePromise = import('./pkg/grym_physics');
} catch (e) {
  console.error('Failed to load WebAssembly module:', e);
}

// Physics configuration
const TIME_STEP = 1.0 / 60.0;  // 60fps
const GRAVITY_CONSTANT = 9.81;
const DAMPING = 0.1;

interface PhysicsMessage {
  type: 'init' | 'step' | 'addField' | 'addParameter' | 'clear';
  data?: any;
}

let physicsWorld: PhysicsWorld;

// Initialize the physics system
async function initPhysics() {
  try {
    const wasmModule = await wasmModulePromise;
    if (!wasmModule) {
      throw new Error('WebAssembly module failed to load');
    }

    if (process.env.NODE_ENV === 'development') {
      wasmModule.init_panic_hook();
    }

    physicsWorld = new wasmModule.PhysicsWorld(TIME_STEP, GRAVITY_CONSTANT, DAMPING);
    self.postMessage({ type: 'initialized' });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to initialize physics engine'
    });
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<PhysicsMessage>) => {
  try {
    switch (event.data.type) {
      case 'init':
        await initPhysics();
        break;

      case 'step':
        if (!physicsWorld) {
          throw new Error('Physics world not initialized');
        }
        const startTime = performance.now();
        const results = await physicsWorld.step();
        const endTime = performance.now();

        self.postMessage({
          type: 'stepComplete',
          data: {
            parameters: results,
            performance: {
              stepTime: endTime - startTime,
              parameterCount: physicsWorld.get_parameter_count(),
              fieldCount: physicsWorld.get_field_count()
            }
          }
        });
        break;

      case 'addField':
        if (!physicsWorld) {
          throw new Error('Physics world not initialized');
        }
        await physicsWorld.add_field(event.data.data);
        self.postMessage({
          type: 'fieldAdded',
          data: { fieldCount: physicsWorld.get_field_count() }
        });
        break;

      case 'addParameter':
        if (!physicsWorld) {
          throw new Error('Physics world not initialized');
        }
        await physicsWorld.add_parameter(event.data.data);
        self.postMessage({
          type: 'parameterAdded',
          data: { parameterCount: physicsWorld.get_parameter_count() }
        });
        break;

      case 'clear':
        if (!physicsWorld) {
          throw new Error('Physics world not initialized');
        }
        physicsWorld.clear_fields();
        physicsWorld.clear_parameters();
        self.postMessage({
          type: 'cleared',
          data: {
            fieldCount: physicsWorld.get_field_count(),
            parameterCount: physicsWorld.get_parameter_count()
          }
        });
        break;

      default:
        throw new Error(`Unknown message type: ${event.data.type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error in physics worker'
    });
  }
};

// Error handling
self.onerror = (error: ErrorEvent) => {
  self.postMessage({
    type: 'error',
    error: `Worker error: ${error.message}`
  });
};

// Performance monitoring
let lastPerformanceReport = performance.now();
const PERFORMANCE_REPORT_INTERVAL = 1000; // Report every second

async function reportPerformance() {
  const now = performance.now();
  if (now - lastPerformanceReport >= PERFORMANCE_REPORT_INTERVAL) {
    if (physicsWorld) {
      const wasmModule = await wasmModulePromise;
      if (wasmModule) {
        const metrics = await wasmModule.get_performance_metrics();
        self.postMessage({
          type: 'performanceMetrics',
          data: metrics
        });
      }
    }
    lastPerformanceReport = now;
  }
}

// Start performance monitoring
setInterval(reportPerformance, PERFORMANCE_REPORT_INTERVAL);
