# Asset Management System

This document provides detailed information about the asset management system used in the grym-synth project to handle large binary files outside of the Git repository.

## Table of Contents

- [Asset Management System](#asset-management-system)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Why External Asset Management?](#why-external-asset-management)
  - [Asset Types](#asset-types)
    - [Machine Learning Models](#machine-learning-models)
    - [Audio Samples and Datasets](#audio-samples-and-datasets)
  - [Directory Structure](#directory-structure)
  - [Asset Configuration](#asset-configuration)
  - [Using the Asset Manager](#using-the-asset-manager)
  - [Command Line Tools](#command-line-tools)
    - [Identifying Large Files](#identifying-large-files)
    - [Cleaning the Repository](#cleaning-the-repository)
    - [Setting Up the Project](#setting-up-the-project)
    - [Downloading Assets](#downloading-assets)
  - [Adding New Assets](#adding-new-assets)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
      - [Asset Download Fails](#asset-download-fails)
      - [Checksum Validation Fails](#checksum-validation-fails)
      - [Asset Not Found](#asset-not-found)
    - [Logs](#logs)
  - [Development Guidelines](#development-guidelines)
    - [Testing with Minimal Assets](#testing-with-minimal-assets)
    - [Creating Mock Assets](#creating-mock-assets)

## Overview

The grym-synth project uses various large binary files such as machine learning models, audio samples, and other assets that are too large to be efficiently stored in the Git repository. The asset management system provides a robust solution for:

1. Identifying and removing large files from the repository
2. Storing these files in a designated external directory
3. Automatically downloading required assets when needed
4. Validating downloaded files with checksums
5. Providing a consistent API for accessing these files

## Why External Asset Management?

GitHub and other Git hosting services recommend keeping repositories under 1GB in size for optimal performance. Large binary files in Git repositories cause several issues:

1. **Slow cloning and pulling**: Every user must download the entire history of large files
2. **Repository bloat**: Even after deleting large files, they remain in Git history
3. **Bandwidth and storage costs**: Unnecessary duplication of large files
4. **Collaboration barriers**: Makes it difficult for new contributors to get started

Our asset management system addresses these issues by:

1. Keeping the repository small and fast to clone
2. Downloading only the assets needed for specific tasks
3. Allowing different versions of assets to be used without affecting the repository
4. Providing clear documentation and tooling for managing assets

## Asset Types

The project uses several types of large assets:

### Machine Learning Models

- **AudioLDM Models**: Used for audio generation
  - audioldm-s-full-v2.ckpt (~1.3GB)
  - audioldm-m-full.ckpt (~2.6GB)
  - audioldm-l-full.ckpt (~3.6GB)

- **Wav2Vec2 Models**: Used for audio feature extraction
  - wav2vec2-base/pytorch_model.bin (~360MB)
  - wav2vec2-large/pytorch_model.bin (~1.2GB)

- **XenakisLDM Models**: Used for audio generation
  - xenakisldm-base.ckpt (~1GB)

- **GAMA Models**: Used for audio pattern recognition
  - gama-model-base.pt (~512MB)
  - gama-model-large.pt (~1GB)

### Audio Samples and Datasets

- Test audio samples (~50MB)
- Training datasets (various sizes)

## Directory Structure

The asset management system uses the following directory structure:

```
grym-synth/           # Main project repository
├── assets/                   # Local assets directory (in .gitignore)
│   ├── models/               # ML models stored locally
│   └── data/                 # Data files stored locally
├── config/
│   └── assets.json           # Asset configuration file
└── src/
    └── utils/
        └── asset-manager.ts  # Asset manager implementation

../assets/                    # External assets directory (outside repository)
├── asset-manifest.json       # Manifest of moved assets
├── models/                   # External ML models
└── data/                     # External data files
```

## Asset Configuration

Assets are configured in the `config/assets.json` file, which contains metadata about each asset:

```json
{
  "version": "1.0",
  "updated": "2025-03-09T12:00:00.000Z",
  "assets": [
    {
      "id": "audioldm-s-full",
      "name": "AudioLDM-S Full Model",
      "description": "Full AudioLDM-S model for audio generation",
      "url": "https://huggingface.co/haoheliu/audioldm-s-full-v2/resolve/main/audioldm-s-full-v2.ckpt",
      "fallbackUrls": [
        "https://zenodo.org/record/7364654/files/audioldm-s-full-v2.ckpt"
      ],
      "localPath": "models/audioldm/audioldm-s-full-v2.ckpt",
      "checksum": "7a0f6bd3bcc2c0ef10f4c50d960162a1e651f9ca6c3c3e7b9e3feff2c6f31c51",
      "size": 1342177280,
      "version": "2.0",
      "required": true,
      "tags": ["model", "audio-generation", "audioldm"]
    }
  ]
}
```

Each asset entry includes:

- `id`: Unique identifier for the asset
- `name`: Human-readable name
- `description`: Description of the asset's purpose
- `url`: Primary download URL
- `fallbackUrls`: Alternative download URLs if the primary fails
- `localPath`: Path where the asset should be stored (relative to assets directory)
- `checksum`: SHA-256 checksum for validation
- `size`: Size in bytes
- `version`: Version identifier
- `required`: Whether the asset is required for basic functionality
- `tags`: Categories for grouping and filtering assets

## Using the Asset Manager

The asset manager provides a TypeScript API for working with external assets:

```typescript
import { assetManager } from '../utils/asset-manager';

// Initialize the asset manager
await assetManager.initialize();

// Get the path to an asset (downloads if necessary)
const modelPath = await assetManager.getAssetPath('audioldm-s-full');

// Check if an asset exists and is valid
const status = await assetManager.checkAsset('audioldm-s-full');
if (status.exists && status.valid) {
  console.log(`Asset is available at: ${status.path}`);
}

// Download a specific asset
await assetManager.downloadAsset('audioldm-s-full');

// Download all required assets
await assetManager.downloadRequiredAssets();

// Get progress updates during downloads
const unregister = assetManager.onProgress((progress) => {
  console.log(`${progress.assetId}: ${progress.percentage}% complete`);
});

// When done with progress updates
unregister();
```

## Command Line Tools

The project includes several command-line tools for managing assets:

### Identifying Large Files

```bash
# Find files larger than 10MB in the repository
./scripts/identify-large-files.sh

# Find files larger than 50MB in a specific directory
./scripts/identify-large-files.sh 50 ./src/data
```

### Cleaning the Repository

```bash
# Move files larger than 10MB to the external assets directory
./scripts/clean-repo.sh

# Move files larger than 5MB from a specific directory
./scripts/clean-repo.sh 5 ./src/data ../my-assets
```

### Setting Up the Project

```bash
# Full setup including dependency installation and asset download
./scripts/setup.sh

# Minimal setup with only essential assets
./scripts/setup.sh --minimal

# Skip asset download
./scripts/setup.sh --skip-assets

# Use a custom external assets directory
./scripts/setup.sh --external-assets-dir /path/to/assets
```

### Downloading Assets

```bash
# Download all required assets
npm run assets:download

# Download only essential assets
npm run assets:download -- --minimal

# Force re-download of all assets
npm run assets:download -- --force

# Use custom configuration
npm run assets:download -- --config ./my-assets.json
```

## Adding New Assets

To add a new asset to the system:

1. **Obtain the asset file** from its source
2. **Calculate the SHA-256 checksum**:
   ```bash
   sha256sum path/to/asset
   ```
3. **Add an entry to `config/assets.json`** with all required metadata
4. **Test the asset download**:
   ```bash
   npm run assets:download -- --force --asset-id your-new-asset-id
   ```

## Troubleshooting

### Common Issues

#### Asset Download Fails

1. Check your internet connection
2. Verify the asset URL is still valid
3. Try using a fallback URL if available
4. Check if you have sufficient disk space
5. Look for more details in the logs

#### Checksum Validation Fails

1. The download may have been corrupted - try downloading again
2. The source file may have changed - update the checksum if appropriate
3. Check if you're using the correct version of the asset

#### Asset Not Found

1. Verify the asset ID is correct
2. Check if the asset is configured in `config/assets.json`
3. Ensure the asset manager is properly initialized

### Logs

Asset management logs are stored in:
- Development: Console output
- Production: `logs/asset-manager.log`

## Development Guidelines

When working with the asset management system:

1. **Never commit large binary files** to the Git repository
2. **Always add new assets** to the configuration file
3. **Include checksums** for all assets to ensure integrity
4. **Mark assets as required** only if they are essential for core functionality
5. **Provide fallback URLs** when possible
6. **Document asset usage** in relevant code and documentation
7. **Use the asset manager API** rather than hardcoding paths
8. **Consider asset versioning** when updating models or datasets

### Testing with Minimal Assets

For development and testing, you can use:

```bash
# Run with minimal assets
npm run dev:minimal

# Run tests with minimal assets
npm test -- --minimal-assets
```

This will use smaller test assets instead of full-sized models.

### Creating Mock Assets

For unit tests, use the mock asset provider:

```typescript
import { createMockAssetManager } from '../utils/asset-manager.mock';

// Create a mock asset manager for testing
const mockAssetManager = createMockAssetManager({
  'audioldm-s-full': '/mock/path/to/audioldm-model.ckpt'
});

// Use the mock in your tests
const modelPath = await mockAssetManager.getAssetPath('audioldm-s-full');
// modelPath will be '/mock/path/to/audioldm-model.ckpt'

