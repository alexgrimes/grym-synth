# Feature Storage System & Python Bridge

This module provides a robust implementation of audio feature storage and pattern management, along with a Python bridge for real-time model inference using Wav2Vec2.

## Architecture

The system consists of two main components:

1. **Python Bridge**
   - `PythonBridgeService`: Manages communication with the Python backend
   - `Wav2Vec2FeatureAdapter`: Adapts the Python bridge for audio feature extraction
   - FastAPI-based Python backend for model inference

2. **Feature Storage System**
   - `FeatureVectorDatabase`: Core storage and retrieval of feature vectors
   - `PatternRepository`: High-level pattern management and querying
   - In-memory index with optional disk persistence

## Setup

### Python Backend

1. Create a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
cd app/api
pip install -r requirements.txt
```

3. Start the server:
```bash
python server.py
```

The server will start on `http://localhost:8000`.

### TypeScript Integration

1. Initialize the feature storage:
```typescript
import { createFeatureStorage } from './storage';

const storage = createFeatureStorage({
  indexPath: './feature-index',
  dimensions: 768, // Wav2Vec2 feature dimension
  distanceMetric: 'cosine',
  persistIndexOnDisk: true
});

await storage.initialize();
```

## Usage Examples

### Storing Patterns

```typescript
const pattern = {
  id: crypto.randomUUID(),
  startTime: 0,
  endTime: 1.5,
  frequencyRange: { low: 20, high: 8000 },
  confidence: 0.9,
  type: 'harmonic',
  features: new Float32Array(768) // Feature vector
};

const metadata = {
  sourceId: 'audio-1',
  createdAt: new Date(),
  lastModified: new Date()
};

const id = await storage.storePattern(pattern, metadata);
```

### Querying Patterns

```typescript
// Query by criteria
const patterns = await storage.queryPatterns({
  type: 'harmonic',
  timeRange: { min: 0, max: 2 },
  confidenceThreshold: 0.7
});

// Find similar patterns
const similarPatterns = await storage.findSimilarPatterns(
  pattern.features,
  { similarityThreshold: 0.8, maxResults: 5 }
);
```

## Configuration

### Python Bridge Configuration

The Python bridge can be configured with:
- `baseUrl`: URL of the Python backend
- `timeout`: Request timeout in milliseconds
- `maxRetries`: Number of retry attempts
- `healthEndpoint`: Health check endpoint
- `modelEndpoints`: Map of model names to endpoints

### Feature Storage Configuration

The feature storage system can be configured with:
- `indexPath`: Path for persistent storage
- `dimensions`: Feature vector dimension
- `distanceMetric`: 'cosine', 'euclidean', or 'dot'
- `persistIndexOnDisk`: Whether to save index to disk
- `similarityThreshold`: Default threshold for similarity searches
- `maxQueryResults`: Default maximum results per query

## Error Handling

The system provides robust error handling:
- Circuit breaking for Python bridge failures
- Automatic retries with backoff
- Health monitoring and metrics collection
- Type-safe error handling in TypeScript

## Performance Considerations

- The feature vector database uses an in-memory index for fast searches
- Batch operations are supported for efficient processing
- Optional disk persistence with configurable save frequency
- Streaming support for large audio files

## Health Monitoring

The system integrates with the HealthMonitor for:
- Request metrics collection
- Error tracking
- Performance monitoring
- System health status

## Further Examples

See `example.ts` for more detailed usage examples including:
- Basic pattern operations
- Batch processing
- Error handling
- Complex queries

## Testing

Run the integration tests:
```bash
npm test src/lib/feature-memory/storage/__tests__/integration.test.ts
```

## Adding New Features

1. Add new functionality to relevant classes
2. Update TypeScript types as needed
3. Add integration tests
4. Update documentation
5. Run the test suite

## Contributing

1. Follow TypeScript best practices
2. Ensure all tests pass
3. Update documentation for API changes
4. Use provided error handling utilities
5. Add integration tests for new features