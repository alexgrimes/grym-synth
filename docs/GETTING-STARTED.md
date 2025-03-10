# Getting Started with Audio Visualization System

## Quick Start

### Installation
```bash
npm install @grym-synth/visualization
```

### Basic Usage
```typescript
import { AudioWaveformVisualization, SpectrogramVisualization } from '@grym-synth/visualization';
import { AudioService } from '@grym-synth/services';

const AudioAnalyzer = () => {
  const audioId = 'your-audio-id';
  return (
    <div>
      <AudioWaveformVisualization
        audioUrl={`/api/audio/${audioId}/stream`}
        height={160}
      />
      <SpectrogramVisualization
        audioId={audioId}
        height={400}
      />
    </div>
  );
};
```

## Prerequisites
- Node.js 16+
- TypeScript 4.5+
- React 18+

## Component Overview

### 1. AudioWaveformVisualization
```typescript
import { AudioWaveformVisualization } from '@grym-synth/visualization';

<AudioWaveformVisualization
  audioUrl="/path/to/audio"
  height={160}
  isPlaying={true}
  onTimeUpdate={(time) => console.log('Current time:', time)}
  showControls={true}
/>
```

### 2. SpectrogramVisualization
```typescript
import { SpectrogramVisualization } from '@grym-synth/visualization';

<SpectrogramVisualization
  audioId="audio-123"
  height={400}
  showPatterns={true}
  onRegionSelect={(region) => {
    console.log('Selected region:', region);
  }}
  colorMap="viridis"
/>
```

### 3. PatternVisualization
```typescript
import { PatternVisualization } from '@grym-synth/visualization';

<PatternVisualization
  patterns={audioPatterns}
  width={300}
  height={100}
  showLabels={true}
/>
```

### 4. SystemHealthDashboard
```typescript
import { SystemHealthDashboard } from '@grym-synth/visualization';

<SystemHealthDashboard
  refreshInterval={5000}
  onAlert={(metric, value) => {
    console.warn(`Alert: ${metric} = ${value}`);
  }}
/>
```

## Service Integration

### Using AudioService
```typescript
import { AudioService } from '@grym-synth/services';

// Upload audio
const uploadFile = async (file: File) => {
  const result = await AudioService.uploadAudio(file);
  console.log('Uploaded file:', result);
};

// Get patterns
const getPatterns = async (audioId: string) => {
  const patterns = await AudioService.getPatterns(audioId);
  console.log('Patterns:', patterns);
};

// Save pattern
const savePattern = async (audioId: string, pattern: SpectralRegion) => {
  const savedPattern = await AudioService.savePattern(audioId, pattern);
  console.log('Saved pattern:', savedPattern);
};
```

## Error Handling

### Component Error Boundaries
```typescript
import { ErrorBoundary } from '@grym-synth/visualization';

<ErrorBoundary fallback={<div>Error loading visualization</div>}>
  <AudioWaveformVisualization {...props} />
</ErrorBoundary>
```

### Service Error Handling
```typescript
try {
  const patterns = await AudioService.getPatterns(audioId);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Performance Tips

1. **Memory Management**
   - Unmount components when not in view
   - Use cleanup functions in useEffect
   - Implement pagination for large datasets

2. **Rendering Optimization**
   - Use appropriate resolution settings
   - Enable WebGL when available
   - Implement virtualization for large lists

3. **Network Optimization**
   - Use streaming for large audio files
   - Implement request caching
   - Use appropriate data decimation

## Common Issues and Solutions

### 1. Audio Loading Issues
```typescript
// Ensure proper audio format support
const audioFormats = ['mp3', 'wav', 'ogg'];
const isFormatSupported = (format: string) => audioFormats.includes(format);
```

### 2. Pattern Detection Issues
```typescript
// Validate pattern data before saving
const validatePattern = (pattern: SpectralRegion) => {
  if (pattern.endTime <= pattern.startTime) {
    throw new Error('Invalid time range');
  }
  if (pattern.highFreq <= pattern.lowFreq) {
    throw new Error('Invalid frequency range');
  }
};
```

### 3. Performance Issues
```typescript
// Implement debouncing for frequent updates
import { debounce } from 'lodash';

const handleUpdate = debounce((value) => {
  // Handle update
}, 100);
```

## Next Steps

1. Check out the [API Documentation](./API.md)
2. Review the [Architecture Guide](./ARCHITECTURE.md)
3. Explore [Advanced Features](./ADVANCED.md)
4. Join our [Discord Community](https://discord.gg/grym-synth)

## Contributing

See our [Contributing Guide](./CONTRIBUTING.md) for details on:
- Setting up the development environment
- Running tests
- Submitting pull requests
- Code style guidelines

