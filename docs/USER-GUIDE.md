# grym-synth - User Guide

## Table of Contents
- [Installation and Setup](#installation-and-setup)
- [Getting Started](#getting-started)
- [Basic Usage](#basic-usage)
- [Advanced Features](#advanced-features)
- [Configuration Options](#configuration-options)
- [Troubleshooting](#troubleshooting)

## Installation and Setup

### Prerequisites

Before installing the grym-synth, ensure you have the following prerequisites:

- **Node.js**: Version 16.x or higher
- **npm**: Version 7.x or higher or **yarn**: Version 1.22.x or higher
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Audio Output Device**: Speakers or headphones
- **Microphone** (optional): For recording audio

### Installation Options

#### Option 1: Docker Installation (Recommended)

The easiest way to get started is using Docker:

1. Install Docker and Docker Compose on your system
2. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/grym-synth.git
   cd grym-synth
   ```
3. Start the application:
   ```bash
   docker-compose up -d
   ```
4. Access the application at `http://localhost:3000`

#### Option 2: Local Installation

For local development or if you prefer not to use Docker:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/grym-synth.git
   cd grym-synth
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration
4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
5. Access the application at `http://localhost:3000`

#### Option 3: Production Deployment

For production deployment, follow the instructions in the [DEPLOYMENT.md](../DEPLOYMENT.md) document.

### First-Time Setup

After installation, follow these steps to set up your account:

1. Open your browser and navigate to `http://localhost:3000`
2. Click "Sign Up" to create a new account
3. Fill in your details and click "Create Account"
4. Verify your email address by clicking the link in the verification email
5. Log in with your credentials
6. Complete the initial setup wizard to configure your preferences

## Getting Started

### Dashboard Overview

After logging in, you'll be taken to the dashboard, which consists of:

1. **Navigation Bar**: Access different sections of the application
2. **Audio Library**: View and manage your audio files
3. **Recent Activity**: See your recent actions and processing results
4. **Quick Actions**: Common tasks like uploading files or creating models
5. **System Status**: Current system health and resource usage

![Dashboard Overview](../public/images/dashboard-overview.png)

### Uploading Your First Audio File

1. Click the "Upload" button in the top navigation bar
2. Select an audio file from your computer (supported formats: WAV, MP3, FLAC, OGG)
3. Add optional metadata like name, tags, and description
4. Click "Upload" to start the upload process
5. Wait for the upload and initial processing to complete
6. You'll be redirected to the audio file details page

### Audio Visualization

Once an audio file is uploaded, you can visualize it in different ways:

1. **Waveform**: Traditional amplitude-over-time visualization
2. **Spectrogram**: Frequency-over-time visualization
3. **3D Visualization**: Three-dimensional representation of audio features
4. **XenakisLDM Visualization**: Mathematical transformation visualization

To switch between visualization modes:

1. Open an audio file from your library
2. Click the "Visualization" tab
3. Select the desired visualization type from the dropdown menu

## Basic Usage

### Audio Library Management

#### Browsing Your Library

1. Click "Library" in the navigation bar
2. Use filters and search to find specific files:
   - Filter by format, duration, tags, or date
   - Search by filename or content tags
3. Sort files by name, date, size, or duration
4. Toggle between grid and list views

#### Organizing with Tags and Collections

1. **Adding Tags**:
   - Select one or more files
   - Click "Add Tags"
   - Enter tags separated by commas
   - Click "Save"

2. **Creating Collections**:
   - Click "Collections" in the sidebar
   - Click "New Collection"
   - Name your collection
   - Add files by dragging them or using the "Add Files" button

### Basic Audio Processing

#### Trimming Audio

1. Open an audio file
2. Click the "Edit" tab
3. Click "Trim"
4. Adjust the start and end points using the waveform selector
5. Click "Apply" to save changes

#### Adjusting Volume

1. Open an audio file
2. Click the "Edit" tab
3. Click "Volume"
4. Adjust the volume level using the slider
5. Click "Apply" to save changes

#### Applying Filters

1. Open an audio file
2. Click the "Edit" tab
3. Click "Filters"
4. Select a filter type (Low Pass, High Pass, Band Pass, etc.)
5. Adjust filter parameters
6. Click "Apply" to save changes

### Audio Analysis

#### Basic Feature Extraction

1. Open an audio file
2. Click the "Analyze" tab
3. Select "Extract Features"
4. Choose which features to extract:
   - Spectral features (centroid, bandwidth, rolloff)
   - Temporal features (zero-crossing rate, RMS energy)
   - Perceptual features (MFCCs, chroma)
5. Click "Extract" to start the process
6. View the results in the "Features" section

#### Audio Comparison

1. Go to the "Analysis" section in the navigation bar
2. Click "Compare Audio"
3. Select two or more audio files from your library
4. Choose comparison features and methods
5. Click "Compare" to start the analysis
6. View the similarity scores and detailed comparison results

## Advanced Features

### Pattern Learning with Feature Memory System

The Feature Memory System allows the application to learn and recognize patterns in audio:

1. Go to the "Learning" section in the navigation bar
2. Click "New Learning Session"
3. Select audio files to include in the learning set
4. Configure learning parameters:
   - Feature selection
   - Pattern length
   - Similarity threshold
   - Learning rate
5. Click "Start Learning" to begin the process
6. Monitor learning progress in the dashboard
7. Once complete, use the "Pattern Recognition" tool to find similar patterns in new audio

### Audio Generation with AudioLDM

Generate new audio based on text descriptions or existing audio:

1. Go to the "Create" section in the navigation bar
2. Click "Generate Audio"
3. Choose generation method:
   - Text-to-Audio: Enter a text description
   - Audio-to-Audio: Select a reference audio file
4. Configure generation parameters:
   - Duration
   - Complexity
   - Variation
5. Click "Generate" to start the process
6. Preview the generated audio and save it to your library if desired

### Mathematical Transformations with XenakisLDM

Apply advanced mathematical transformations to your audio:

1. Open an audio file
2. Click the "Transform" tab
3. Select "XenakisLDM Transformations"
4. Choose a transformation type:
   - Spatial-Spectral Sieve
   - Stochastic Distribution
   - Cellular Automata
   - Markov Chain
5. Configure transformation parameters
6. Preview the transformation in real-time
7. Click "Apply" to save changes

### Model Training and Prediction

Train machine learning models on your audio data:

1. Go to the "Models" section in the navigation bar
2. Click "New Model"
3. Select model type:
   - Classification (genre, instrument, emotion)
   - Regression (tempo, energy, valence)
   - Clustering (unsupervised grouping)
4. Select training data from your library
5. Configure model parameters
6. Click "Train" to start the training process
7. Monitor training progress and performance metrics
8. Once trained, use the model for predictions on new audio

## Configuration Options

### Application Settings

Access application settings by clicking your profile icon and selecting "Settings":

#### General Settings

- **Theme**: Choose between light, dark, or system theme
- **Language**: Select your preferred language
- **Notifications**: Configure email and in-app notifications
- **Default View**: Set default visualization and library view

#### Audio Processing Settings

- **Default Format**: Set the default output format for processed audio
- **Sample Rate**: Configure default sample rate for processing
- **Bit Depth**: Set default bit depth for audio processing
- **Channel Configuration**: Set default channel configuration (mono/stereo)

#### Performance Settings

- **Processing Threads**: Configure the number of threads for audio processing
- **Cache Size**: Set the maximum cache size for audio processing
- **Memory Limit**: Configure memory limits for large file processing
- **GPU Acceleration**: Enable/disable GPU acceleration for supported operations

### API Access

For developers who want to integrate with the grym-synth:

1. Go to "Settings" > "API Access"
2. Click "Generate API Key"
3. Configure access permissions for the key
4. Copy the API key and secret
5. Use the API documentation to make requests

## Troubleshooting

### Common Issues and Solutions

#### Audio Upload Fails

**Possible causes:**
- File is too large
- Unsupported file format
- Network connection issues

**Solutions:**
1. Check the file size limit in your settings
2. Convert the file to a supported format (WAV, MP3, FLAC, OGG)
3. Check your network connection and try again
4. Try uploading a smaller file first

#### Processing Takes Too Long

**Possible causes:**
- Large file size
- Complex processing operations
- Limited system resources

**Solutions:**
1. Check system resource usage in the dashboard
2. Reduce the file size by trimming or downsampling
3. Adjust performance settings to optimize resource usage
4. Try processing in smaller batches

#### Visualization Not Displaying

**Possible causes:**
- Browser compatibility issues
- WebGL not supported or disabled
- JavaScript errors

**Solutions:**
1. Update your browser to the latest version
2. Enable WebGL in your browser settings
3. Check the browser console for specific errors
4. Try a different browser

#### Model Training Fails

**Possible causes:**
- Insufficient training data
- Inconsistent data format
- Memory limitations

**Solutions:**
1. Add more training examples
2. Ensure all training data has consistent format and features
3. Reduce model complexity or batch size
4. Check system resources and increase memory allocation if possible

### Getting Help

If you encounter issues not covered in this guide:

1. Check the [FAQ section](https://docs.grym-synth.com/faq) for common questions
2. Search the [community forums](https://community.grym-synth.com) for similar issues
3. Review the [known issues](https://github.com/yourusername/grym-synth/issues) on GitHub
4. Contact support at support@grym-synth.com

### Reporting Bugs

If you find a bug:

1. Go to the [GitHub Issues page](https://github.com/yourusername/grym-synth/issues)
2. Click "New Issue"
3. Select "Bug Report"
4. Fill in the template with as much detail as possible
5. Include steps to reproduce, expected behavior, and actual behavior
6. Attach screenshots or log files if available

