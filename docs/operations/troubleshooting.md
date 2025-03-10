# GAMA Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered with the GAMA integration in the grym-synth. It includes diagnostic procedures, common problems, and their solutions.

## Diagnostic Procedures

### 1. Checking Service Status

Before diving into specific issues, check the overall status of the GAMA service:

```bash
# Check if the service is running
curl http://localhost:3000/health

# Check detailed health status
curl http://localhost:3000/health/deep
```

### 2. Checking Logs

Examine the GAMA logs for error messages and warnings:

```bash
# View recent logs
tail -n 100 logs/gama.log

# Search for error messages
grep -i "error" logs/gama.log

# Search for specific error types
grep -i "memory" logs/gama.log
grep -i "timeout" logs/gama.log
grep -i "bridge" logs/gama.log
```

### 3. Checking Resource Usage

Monitor resource usage to identify potential resource constraints:

```bash
# Check memory usage
free -h

# Check CPU usage
top -b -n 1 | head -n 20

# Check disk space
df -h

# Check GPU usage (if applicable)
nvidia-smi
```

### 4. Checking Python Bridge

Verify that the Python bridge is functioning correctly:

```bash
# Check if Python process is running
ps aux | grep gama_operations.py

# Check Python logs
tail -n 100 logs/gama-python.log

# Test Python environment
python -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}')"
```

### 5. Checking Model Files

Verify that the GAMA model files are present and not corrupted:

```bash
# List model files
ls -la models/gama

# Check file sizes
du -sh models/gama/*

# Verify model integrity
python scripts/verify_gama_model.py --model-path models/gama
```

## Common Issues and Solutions

### 1. Service Fails to Start

#### Symptoms:
- Service doesn't respond to requests
- Health check returns an error or no response
- Logs show startup errors

#### Possible Causes and Solutions:

##### Port Conflict
**Cause**: Another service is using the same port.

**Solution**:
1. Check if the port is in use:
   ```bash
   netstat -tuln | grep 3000
   ```
2. Change the port in the configuration:
   ```json
   {
     "server": {
       "port": 3001
     }
   }
   ```

##### Missing Dependencies
**Cause**: Required dependencies are not installed.

**Solution**:
1. Check for missing Node.js dependencies:
   ```bash
   npm install
   ```
2. Check for missing Python dependencies:
   ```bash
   pip install -r requirements-gama.txt
   ```

##### Configuration Errors
**Cause**: Invalid configuration settings.

**Solution**:
1. Validate the configuration file:
   ```bash
   npm run validate-config
   ```
2. Check for syntax errors in the configuration file:
   ```bash
   jsonlint config/gama.json
   ```
3. Reset to default configuration:
   ```bash
   cp config/gama.default.json config/gama.json
   ```

### 2. Out of Memory Errors

#### Symptoms:
- Service crashes during processing
- Logs show "Out of memory" or "OOM" errors
- High memory usage reported in monitoring

#### Possible Causes and Solutions:

##### Insufficient System Memory
**Cause**: The system doesn't have enough memory for GAMA operations.

**Solution**:
1. Increase system memory (if possible)
2. Reduce memory usage in configuration:
   ```json
   {
     "maxMemory": "2GB",
     "quantization": "8bit"
   }
   ```
3. Process smaller audio chunks:
   ```typescript
   // Split audio into smaller chunks
   const chunks = splitAudio(audio, 10); // 10-second chunks
   const results = [];

   for (const chunk of chunks) {
     const result = await gamaService.processAudio(chunk, options);
     results.push(result);
   }

   // Combine results
   const combinedResult = combineResults(results);
   ```

##### Memory Leak
**Cause**: The service has a memory leak.

**Solution**:
1. Update to the latest version of the GAMA integration
2. Implement periodic service restart:
   ```bash
   # Add to crontab
   0 */6 * * * systemctl restart grym-synth
   ```
3. Enable garbage collection:
   ```json
   {
     "memoryConfig": {
       "enableGC": true,
       "gcInterval": 60000
     }
   }
   ```

##### GPU Memory Issues
**Cause**: GPU memory is exhausted (if using GPU).

**Solution**:
1. Use CPU instead of GPU:
   ```json
   {
     "device": "cpu"
   }
   ```
2. Enable memory optimization:
   ```json
   {
     "memoryConfig": {
       "useGradientCheckpointing": true,
       "useFp16": true
     }
   }
   ```
3. Reduce batch size:
   ```json
   {
     "memoryConfig": {
       "maxBatchSize": 1
     }
   }
   ```

### 3. Python Bridge Failures

#### Symptoms:
- "Bridge not initialized" errors
- "Python process exited unexpectedly" errors
- Timeouts during operations

#### Possible Causes and Solutions:

##### Python Process Crash
**Cause**: The Python process crashes due to errors.

**Solution**:
1. Check Python logs for errors:
   ```bash
   tail -n 100 logs/gama-python.log
   ```
2. Increase bridge restart attempts:
   ```json
   {
     "errorConfig": {
       "maxBridgeRestarts": 5,
       "bridgeRestartDelay": 2000
     }
   }
   ```
3. Update Python dependencies:
   ```bash
   pip install -r requirements-gama.txt --upgrade
   ```

##### Communication Timeout
**Cause**: Operations take too long, causing communication timeouts.

**Solution**:
1. Increase bridge timeout:
   ```json
   {
     "errorConfig": {
       "bridgeTimeout": 60000
     }
   }
   ```
2. Optimize Python operations:
   ```json
   {
     "pythonConfig": {
       "optimizeForSpeed": true,
       "useNumba": true
     }
   }
   ```
3. Check for system resource constraints:
   ```bash
   top -b -n 1 | head -n 20
   ```

##### Python Environment Issues
**Cause**: Python environment is not set up correctly.

**Solution**:
1. Recreate Python environment:
   ```bash
   rm -rf gama_env
   python -m venv gama_env
   source gama_env/bin/activate
   pip install -r requirements-gama.txt
   ```
2. Check Python version:
   ```bash
   python --version
   ```
3. Verify PyTorch installation:
   ```bash
   python -c "import torch; print(torch.__version__)"
   ```

### 4. Model Loading Failures

#### Symptoms:
- "Failed to load model" errors
- "Model file not found" errors
- Service initialization fails

#### Possible Causes and Solutions:

##### Missing Model Files
**Cause**: Model files are missing or in the wrong location.

**Solution**:
1. Check if model files exist:
   ```bash
   ls -la models/gama
   ```
2. Download model files:
   ```bash
   python scripts/download_gama_model.py --output models/gama
   ```
3. Update model path in configuration:
   ```json
   {
     "modelPath": "/absolute/path/to/models/gama"
   }
   ```

##### Corrupted Model Files
**Cause**: Model files are corrupted.

**Solution**:
1. Verify model integrity:
   ```bash
   python scripts/verify_gama_model.py --model-path models/gama
   ```
2. Remove and redownload model files:
   ```bash
   rm -rf models/gama
   python scripts/download_gama_model.py --output models/gama
   ```
3. Use a different model version:
   ```json
   {
     "modelConfig": {
       "version": "7b-v1.1"
     }
   }
   ```

##### Incompatible Model Version
**Cause**: The model version is incompatible with the current code.

**Solution**:
1. Check model version compatibility:
   ```bash
   python scripts/check_model_compatibility.py --model-path models/gama
   ```
2. Update GAMA integration to a compatible version:
   ```bash
   npm install @grym-synth/gama-integration@compatible-version
   ```
3. Use a different model version:
   ```json
   {
     "modelConfig": {
       "version": "compatible-version"
     }
   }
   ```

### 5. Slow Performance

#### Symptoms:
- Operations take longer than expected
- Timeouts during processing
- High CPU/GPU usage

#### Possible Causes and Solutions:

##### Insufficient Resources
**Cause**: The system doesn't have enough resources for optimal performance.

**Solution**:
1. Upgrade hardware (if possible)
2. Reduce resource usage:
   ```json
   {
     "memoryConfig": {
       "maxBatchSize": 1,
       "useFp16": true
     }
   }
   ```
3. Use a smaller model:
   ```json
   {
     "modelConfig": {
       "size": "small"
     }
   }
   ```

##### Inefficient Configuration
**Cause**: The service is not configured for optimal performance.

**Solution**:
1. Enable performance optimizations:
   ```json
   {
     "performanceConfig": {
       "enableJIT": true,
       "enableFusedOperators": true,
       "enableCaching": true
     }
   }
   ```
2. Adjust batch size:
   ```json
   {
     "memoryConfig": {
       "maxBatchSize": 4
     }
   }
   ```
3. Use GPU if available:
   ```json
   {
     "device": "cuda"
   }
   ```

##### Background Processes
**Cause**: Other processes are consuming resources.

**Solution**:
1. Check for resource-intensive processes:
   ```bash
   top -b -n 1 | head -n 20
   ```
2. Terminate unnecessary processes:
   ```bash
   kill <pid>
   ```
3. Set process priority:
   ```bash
   nice -n -10 npm start
   ```

### 6. Quality Issues

#### Symptoms:
- Poor transcription quality
- Low confidence scores
- Validation failures

#### Possible Causes and Solutions:

##### Audio Quality Issues
**Cause**: The input audio has quality issues.

**Solution**:
1. Preprocess audio before processing:
   ```typescript
   // Preprocess audio
   const preprocessedAudio = await audioPreprocessor.process(audio, {
     normalize: true,
     removeNoise: true,
     trimSilence: true
   });

   // Process preprocessed audio
   const result = await gamaService.processAudio(preprocessedAudio, options);
   ```
2. Adjust audio processing options:
   ```json
   {
     "audioConfig": {
       "sampleRate": 16000,
       "channels": 1,
       "normalize": true
     }
   }
   ```
3. Use a different model for challenging audio:
   ```json
   {
     "modelConfig": {
       "version": "7b-robust"
     }
   }
   ```

##### Model Quality Issues
**Cause**: The model is not performing as expected.

**Solution**:
1. Use a different model version:
   ```json
   {
     "modelConfig": {
       "version": "7b-v1.1"
     }
   }
   ```
2. Adjust model parameters:
   ```json
   {
     "modelConfig": {
       "temperature": 0.5,
       "topP": 0.9,
       "topK": 50
     }
   }
   ```
3. Fine-tune the model for your specific use case:
   ```bash
   python scripts/finetune_gama.py --data-path data/custom --output models/gama-finetuned
   ```

##### Validation Issues
**Cause**: The validation criteria are too strict.

**Solution**:
1. Adjust validation thresholds:
   ```json
   {
     "qaConfig": {
       "audioFeaturesConfig": {
         "minValue": -20,
         "maxValue": 20
       },
       "patternConfig": {
         "minConfidence": 0.3
       }
     }
   }
   ```
2. Disable strict validation:
   ```json
   {
     "qaConfig": {
       "strictValidation": false
     }
   }
   ```
3. Implement custom validation logic:
   ```typescript
   // Custom validation function
   function validateOutput(output, type) {
     // Custom validation logic
     return {
       valid: true,
       checks: [
         {
           name: 'custom-check',
           passed: true,
           details: 'Custom validation passed'
         }
       ]
     };
   }

   // Register custom validator
   gamaService.registerValidator('audio-features', validateOutput);
   ```

### 7. Error Handling Issues

#### Symptoms:
- Unhandled exceptions
- Service crashes on errors
- No recovery from errors

#### Possible Causes and Solutions:

##### Missing Error Handlers
**Cause**: Error handlers are not implemented or registered.

**Solution**:
1. Implement error handlers:
   ```typescript
   // Implement error handler
   class CustomErrorHandler {
     async handleError(error, context) {
       console.error('Error:', error.message);

       // Implement recovery logic
       if (error.message.includes('timeout')) {
         return {
           recoverySuccessful: true,
           result: await context.operation(context.params)
         };
       }

       return {
         recoverySuccessful: false,
         error
       };
     }
   }

   // Register error handler
   gamaService.setErrorHandler(new CustomErrorHandler());
   ```
2. Enable built-in error handlers:
   ```json
   {
     "errorConfig": {
       "enableDefaultHandlers": true
     }
   }
   ```
3. Configure error handling strategies:
   ```json
   {
     "errorConfig": {
       "strategies": {
         "timeout": "retry",
         "memory": "optimize",
         "bridge": "restart"
       }
     }
   }
   ```

##### Incorrect Error Categorization
**Cause**: Errors are not categorized correctly.

**Solution**:
1. Implement custom error categorization:
   ```typescript
   // Custom error categorization
   function categorizeError(error) {
     if (error.message.includes('timeout')) {
       return 'timeout';
     } else if (error.message.includes('memory')) {
       return 'memory';
     } else if (error.message.includes('bridge')) {
       return 'bridge';
     } else {
       return 'unknown';
     }
   }

   // Register custom categorization
   gamaService.setErrorCategorizer(categorizeError);
   ```
2. Update error patterns in configuration:
   ```json
   {
     "errorConfig": {
       "patterns": {
         "timeout": ["timeout", "timed out", "deadline exceeded"],
         "memory": ["memory", "OOM", "allocation failed"],
         "bridge": ["bridge", "process", "communication"]
       }
     }
   }
   ```
3. Enable detailed error logging:
   ```json
   {
     "logConfig": {
       "level": "debug",
       "includeErrorDetails": true
     }
   }
   ```

##### Recovery Strategy Failures
**Cause**: Recovery strategies are failing.

**Solution**:
1. Implement more robust recovery strategies:
   ```typescript
   // Implement robust retry strategy
   class RobustRetryStrategy {
     async execute(context) {
       let lastError;
       let delay = 1000;

       for (let attempt = 1; attempt <= 5; attempt++) {
         try {
           // Wait for the backoff period
           await new Promise(resolve => setTimeout(resolve, delay));

           // Attempt to execute the operation again
           return await context.operation(context.params);
         } catch (error) {
           lastError = error;
           delay *= 1.5;

           // Log retry attempt
           console.warn(`Retry attempt ${attempt} failed: ${error.message}`);
         }
       }

       throw new Error(`Max retries exceeded: ${lastError.message}`);
     }
   }

   // Register robust retry strategy
   gamaService.registerRecoveryStrategy('timeout', new RobustRetryStrategy());
   ```
2. Implement fallback strategies:
   ```json
   {
     "errorConfig": {
       "fallbackStrategies": {
         "timeout": "simplifiedOperation",
         "memory": "reducedQuality",
         "bridge": "alternativeImplementation"
       }
     }
   }
   ```
3. Implement circuit breaker pattern:
   ```typescript
   // Implement circuit breaker
   class CircuitBreaker {
     constructor() {
       this.failures = 0;
       this.lastFailure = 0;
       this.state = 'closed';
     }

     async execute(operation) {
       if (this.state === 'open') {
         if (Date.now() - this.lastFailure > 60000) {
           this.state = 'half-open';
         } else {
           throw new Error('Circuit breaker is open');
         }
       }

       try {
         const result = await operation();

         if (this.state === 'half-open') {
           this.reset();
         }

         return result;
       } catch (error) {
         this.failures++;
         this.lastFailure = Date.now();

         if (this.failures >= 3) {
           this.state = 'open';
         }

         throw error;
       }
     }

     reset() {
       this.failures = 0;
       this.state = 'closed';
     }
   }

   // Use circuit breaker
   const circuitBreaker = new CircuitBreaker();

   try {
     const result = await circuitBreaker.execute(() => gamaService.processAudio(audio, options));
     return result;
   } catch (error) {
     // Handle circuit breaker open
     return fallbackResult;
   }
   ```

## Advanced Troubleshooting

### 1. Debugging the Python Bridge

For issues with the Python bridge, you can enable debug mode to get more detailed information:

```json
{
  "bridgeConfig": {
    "debug": true,
    "logLevel": "debug",
    "logStdout": true,
    "logStderr": true
  }
}
```

You can also run the Python script directly to test it:

```bash
# Set environment variables
export GAMA_MODEL_PATH="models/gama"
export GAMA_DEVICE="cpu"
export GAMA_QUANTIZATION="8bit"

# Run the Python script
python -m gama_operations
```

### 2. Profiling Performance

To identify performance bottlenecks, you can enable profiling:

```json
{
  "performanceConfig": {
    "enableProfiling": true,
    "profileOutputPath": "logs/profile",
    "sampleRate": 100
  }
}
```

This will generate profiling data that can be analyzed with tools like Chrome DevTools (for Node.js) or PyTorch Profiler (for Python).

### 3. Memory Analysis

For memory issues, you can enable detailed memory tracking:

```json
{
  "memoryConfig": {
    "trackAllocations": true,
    "trackPeakUsage": true,
    "logMemoryStats": true,
    "memoryStatsInterval": 5000
  }
}
```

For Node.js memory analysis:

```bash
# Run with heap profiling
node --inspect --heap-prof app.js
```

For Python memory analysis:

```bash
# Install memory profiler
pip install memory-profiler

# Run with memory profiling
python -m memory_profiler gama_operations.py
```

### 4. Custom Diagnostic Scripts

You can create custom diagnostic scripts to check for specific issues:

#### Check GAMA Environment

```python
# check_gama_env.py
import os
import sys
import torch
import json

def check_environment():
    results = {
        "python_version": sys.version,
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
        "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "gpu_names": [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())] if torch.cuda.is_available() else [],
        "environment_variables": {
            "GAMA_MODEL_PATH": os.environ.get("GAMA_MODEL_PATH"),
            "GAMA_DEVICE": os.environ.get("GAMA_DEVICE"),
            "GAMA_QUANTIZATION": os.environ.get("GAMA_QUANTIZATION")
        }
    }

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    check_environment()
```

#### Test GAMA Processing

```typescript
// test_gama_processing.js
const { GAMAService } = require('@grym-synth/gama-integration');
const fs = require('fs');

async function testProcessing() {
  try {
    // Initialize GAMA service
    const gamaService = new GAMAService({
      id: 'gama-test',
      modelPath: process.env.GAMA_MODEL_PATH || 'models/gama',
      maxMemory: '4GB',
      device: process.env.GAMA_DEVICE || 'cpu',
      quantization: process.env.GAMA_QUANTIZATION || '8bit'
    });

    console.log('Initializing GAMA service...');
    await gamaService.initialize();
    console.log('GAMA service initialized successfully');

    // Load test audio
    const audioPath = process.argv[2] || 'test/samples/test.wav';
    console.log(`Loading audio from ${audioPath}...`);
    const audio = await loadAudio(audioPath);
    console.log(`Loaded audio: ${audio.data.length} samples, ${audio.channels} channels, ${audio.sampleRate}Hz`);

    // Process audio
    console.log('Processing audio...');
    const startTime = Date.now();
    const result = await gamaService.process(audio);
    const duration = Date.now() - startTime;
    console.log(`Processing completed in ${duration}ms`);
    console.log('Result:', JSON.stringify(result, null, 2));

    // Shutdown service
    await gamaService.shutdown();
    console.log('GAMA service shut down successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

async function loadAudio(path) {
  // Simplified audio loading for testing
  // In a real implementation, use a proper audio loading library
  const buffer = fs.readFileSync(path);
  // This is a placeholder, actual implementation would parse the WAV file
  return {
    data: new Float32Array(1000),
    channels: 1,
    sampleRate: 16000
  };
}

testProcessing();
```

## Conclusion

This troubleshooting guide covers common issues with the GAMA integration and provides solutions to resolve them. By following the diagnostic procedures and applying the appropriate solutions, you can maintain a reliable and efficient GAMA integration in the grym-synth.

If you encounter issues not covered in this guide, please refer to the [GAMA GitHub repository](https://github.com/your-organization/gama-integration) for the latest updates and additional troubleshooting information, or contact the support team at support@example.com.

