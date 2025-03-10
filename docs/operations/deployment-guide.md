# GAMA Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the GAMA integration in the grym-synth. It covers environment setup, installation, configuration, and verification.

## Prerequisites

Before deploying the GAMA integration, ensure you have the following prerequisites:

### Hardware Requirements

- **CPU**: 4+ cores recommended (8+ cores for production)
- **RAM**: 8GB minimum (16GB+ recommended for production)
- **GPU**: NVIDIA GPU with CUDA support recommended for optimal performance
- **Disk Space**: 10GB minimum for models and temporary files

### Software Requirements

- **Node.js**: v16.x or later
- **Python**: 3.8 or later
- **CUDA Toolkit**: 11.x or later (if using GPU)
- **cuDNN**: Compatible with your CUDA version (if using GPU)

### System Dependencies

- **Windows**:
  - Microsoft Visual C++ Redistributable
  - Git for Windows
  - PowerShell 5.0 or later

- **Linux**:
  - build-essential
  - libsndfile1
  - ffmpeg

- **macOS**:
  - Xcode Command Line Tools
  - Homebrew
  - libsndfile
  - ffmpeg

## Environment Setup

### 1. Python Environment Setup

Create a dedicated Python environment for GAMA:

#### Using Conda (Recommended)

```bash
# Create a new conda environment
conda create -n gama python=3.8
conda activate gama

# Install PyTorch with CUDA support (adjust version as needed)
conda install pytorch torchvision torchaudio pytorch-cuda=11.8 -c pytorch -c nvidia

# Install additional dependencies
pip install -r requirements-gama.txt
```

#### Using venv

```bash
# Create a new virtual environment
python -m venv gama_env
source gama_env/bin/activate  # On Windows: gama_env\Scripts\activate

# Install PyTorch with CUDA support (adjust version as needed)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install additional dependencies
pip install -r requirements-gama.txt
```

### 2. Model Download

Download the GAMA model files:

```bash
# Create models directory if it doesn't exist
mkdir -p models/gama

# Download model files
python scripts/download_gama_model.py --output models/gama
```

The script will download the following files:
- `config.json`: Model configuration
- `pytorch_model.bin`: Model weights
- `tokenizer.json`: Tokenizer configuration
- `special_tokens_map.json`: Special tokens mapping

### 3. Environment Variables

Set the following environment variables:

```bash
# Windows (PowerShell)
$env:GAMA_MODEL_PATH = "models/gama"
$env:GAMA_DEVICE = "cuda"  # Use "cpu" if no GPU is available
$env:GAMA_QUANTIZATION = "8bit"  # Use "none" for full precision

# Linux/macOS
export GAMA_MODEL_PATH="models/gama"
export GAMA_DEVICE="cuda"  # Use "cpu" if no GPU is available
export GAMA_QUANTIZATION="8bit"  # Use "none" for full precision
```

For persistent configuration, add these variables to your environment configuration files (e.g., `.bashrc`, `.zshrc`, or system environment variables on Windows).

## Installation

### 1. Install the grym-synth

If you haven't already installed the grym-synth, follow these steps:

```bash
# Clone the repository
git clone https://github.com/your-organization/grym-synth.git
cd grym-synth

# Install dependencies
npm install
```

### 2. Install GAMA Integration

Install the GAMA integration package:

```bash
# Install GAMA integration
npm install @grym-synth/gama-integration
```

### 3. Configure GAMA Integration

Create or update the GAMA configuration file:

```bash
# Create configuration directory if it doesn't exist
mkdir -p config

# Create or update GAMA configuration
cat > config/gama.json << EOF
{
  "id": "gama",
  "modelPath": "${GAMA_MODEL_PATH}",
  "maxMemory": "4GB",
  "device": "${GAMA_DEVICE}",
  "quantization": "${GAMA_QUANTIZATION}",
  "logConfig": {
    "level": "info",
    "file": "logs/gama.log",
    "console": true
  },
  "monitorConfig": {
    "metricsInterval": 5000,
    "operationThresholds": {
      "processAudio": {
        "duration": 10000
      },
      "extractFeatures": {
        "duration": 5000
      }
    },
    "metricThresholds": {
      "memory": {
        "used": 3221225472
      },
      "cpu": {
        "process": 80
      }
    }
  },
  "errorConfig": {
    "maxRetries": 3,
    "backoffFactor": 1.5,
    "initialDelayMs": 1000,
    "reducedBatchSize": 1,
    "bridgeTimeout": 30000,
    "maxBridgeRestarts": 3,
    "bridgeRestartDelay": 2000
  },
  "qaConfig": {
    "audioFeaturesConfig": {
      "expectedDimensions": 768,
      "minValue": -10,
      "maxValue": 10
    },
    "patternConfig": {
      "minConfidence": 0.5
    },
    "responseTimeConfig": {
      "maxResponseTime": 10000
    }
  }
}
EOF
```

### 4. Register GAMA Service

Register the GAMA service with the grym-synth:

```typescript
// src/services/index.ts
import { GAMAService } from '@grym-synth/gama-integration';
import { GAMAAdapter } from '@grym-synth/gama-integration';
import { registerService } from '../core/service-registry';
import { loadConfig } from '../utils/config-loader';

// Load GAMA configuration
const gamaConfig = loadConfig('gama');

// Create GAMA service
const gamaService = new GAMAService(gamaConfig);

// Create GAMA adapter
const gamaAdapter = new GAMAAdapter({
  gamaService,
  featureMemory: getFeatureMemoryProvider()
});

// Register GAMA service
registerService('gama', gamaService, gamaAdapter);
```

## Deployment Options

### 1. Development Deployment

For development environments, you can run the grym-synth with GAMA integration using:

```bash
# Start the development server
npm run dev
```

### 2. Production Deployment

For production environments, follow these steps:

#### Build the Application

```bash
# Build the application
npm run build
```

#### Deploy as a Standalone Service

```bash
# Start the production server
npm run start
```

#### Deploy with Docker

Create a Dockerfile:

```dockerfile
FROM node:16-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create Python environment and install dependencies
RUN python3 -m pip install --no-cache-dir -r requirements-gama.txt

# Download GAMA model
RUN mkdir -p models/gama && \
    python3 scripts/download_gama_model.py --output models/gama

# Set environment variables
ENV NODE_ENV=production
ENV GAMA_MODEL_PATH=models/gama
ENV GAMA_DEVICE=cuda
ENV GAMA_QUANTIZATION=8bit

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

Build and run the Docker container:

```bash
# Build the Docker image
docker build -t grym-synth:latest .

# Run the Docker container
docker run -p 3000:3000 grym-synth:latest
```

#### Deploy with Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GAMA_MODEL_PATH=models/gama
      - GAMA_DEVICE=cuda
      - GAMA_QUANTIZATION=8bit
    volumes:
      - ./logs:/app/logs
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  monitoring:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    depends_on:
      - app

  dashboard:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana-storage:/var/lib/grafana
    depends_on:
      - monitoring

volumes:
  grafana-storage:
```

Run with Docker Compose:

```bash
# Start the services
docker-compose up -d
```

## Configuration

### 1. Basic Configuration

The basic configuration options for GAMA are:

- `id`: Unique identifier for the GAMA service
- `modelPath`: Path to the GAMA model
- `maxMemory`: Maximum memory to use (e.g., "4GB")
- `device`: Device to use for processing ("cpu" or "cuda")
- `quantization`: Quantization level ("8bit", "4bit", or "none")

### 2. Advanced Configuration

#### Logging Configuration

```json
"logConfig": {
  "level": "info",
  "file": "logs/gama.log",
  "console": true,
  "format": "json",
  "maxFiles": 5,
  "maxSize": "10m"
}
```

#### Monitoring Configuration

```json
"monitorConfig": {
  "metricsInterval": 5000,
  "operationThresholds": {
    "processAudio": {
      "duration": 10000
    },
    "extractFeatures": {
      "duration": 5000
    }
  },
  "metricThresholds": {
    "memory": {
      "used": 3221225472
    },
    "cpu": {
      "process": 80
    }
  },
  "alertConfig": {
    "email": {
      "enabled": true,
      "recipients": ["alerts@example.com"]
    },
    "slack": {
      "enabled": true,
      "webhook": "https://hooks.slack.com/services/XXX/YYY/ZZZ"
    }
  }
}
```

#### Error Handling Configuration

```json
"errorConfig": {
  "maxRetries": 3,
  "backoffFactor": 1.5,
  "initialDelayMs": 1000,
  "reducedBatchSize": 1,
  "bridgeTimeout": 30000,
  "maxBridgeRestarts": 3,
  "bridgeRestartDelay": 2000,
  "fallbackModel": "models/gama-small"
}
```

#### Quality Assurance Configuration

```json
"qaConfig": {
  "audioFeaturesConfig": {
    "expectedDimensions": 768,
    "minValue": -10,
    "maxValue": 10
  },
  "patternConfig": {
    "minConfidence": 0.5,
    "maxPatterns": 10
  },
  "responseTimeConfig": {
    "maxResponseTime": 10000,
    "p95ResponseTime": 5000
  },
  "metricsConfig": {
    "storageConfig": {
      "type": "file",
      "path": "data/metrics"
    }
  }
}
```

## Verification

### 1. Verify Installation

Verify that the GAMA integration is installed correctly:

```bash
# Check if GAMA model files exist
ls -la models/gama

# Check if Python environment is set up correctly
python -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}')"
```

### 2. Run Tests

Run the GAMA integration tests:

```bash
# Run GAMA tests
npm run test:gama
```

### 3. Verify Service

Verify that the GAMA service is running correctly:

```bash
# Start the service
npm run start

# Test the service with a sample audio file
curl -X POST -H "Content-Type: application/json" -d '{"audio": "sample.wav"}' http://localhost:3000/api/audio/process
```

## Troubleshooting

### 1. Model Loading Issues

If you encounter issues loading the GAMA model:

- Check if the model files exist in the specified path
- Verify that you have sufficient disk space
- Check if the model configuration is correct
- Try downloading the model again

### 2. CUDA Issues

If you encounter CUDA-related issues:

- Verify that CUDA is installed correctly
- Check if PyTorch was installed with CUDA support
- Try using a different CUDA version
- Fall back to CPU if necessary

### 3. Memory Issues

If you encounter memory issues:

- Reduce the `maxMemory` setting
- Enable quantization ("8bit" or "4bit")
- Process smaller audio chunks
- Use a smaller model if available

### 4. Python Bridge Issues

If you encounter issues with the Python bridge:

- Check if Python is installed correctly
- Verify that all Python dependencies are installed
- Check the Python process logs for errors
- Increase the bridge timeout setting

## Conclusion

This deployment guide provides comprehensive instructions for deploying the GAMA integration in the grym-synth. By following these steps, you can set up a robust and efficient GAMA deployment for audio processing and feature extraction.

