# grym-synth - API Reference

## Table of Contents
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Audio Files](#audio-files)
  - [Processing](#processing)
  - [Analysis](#analysis)
  - [Models](#models)
  - [User Management](#user-management)

## Authentication

The grym-synth API uses JWT (JSON Web Tokens) for authentication.

### Obtaining a Token

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

### Using Authentication

Include the token in the Authorization header for all authenticated requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh

```http
POST /api/auth/refresh
```

**Request Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

## Error Handling

The API uses standard HTTP status codes and returns error details in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional information about the error"
    }
  }
}
```

### Common Error Codes

| Status Code | Error Code        | Description                                             |
| ----------- | ----------------- | ------------------------------------------------------- |
| 400         | INVALID_REQUEST   | The request is malformed or contains invalid parameters |
| 401         | UNAUTHORIZED      | Authentication is required or has failed                |
| 403         | FORBIDDEN         | The authenticated user doesn't have permission          |
| 404         | NOT_FOUND         | The requested resource doesn't exist                    |
| 409         | CONFLICT          | The request conflicts with the current state            |
| 422         | VALIDATION_FAILED | The request data failed validation                      |
| 429         | RATE_LIMITED      | Too many requests, rate limit exceeded                  |
| 500         | SERVER_ERROR      | An unexpected error occurred on the server              |

## Rate Limiting

API requests are subject to rate limiting to ensure fair usage and system stability.

**Rate Limits:**
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1614556800
```

When a rate limit is exceeded, the API returns a 429 Too Many Requests response.

## API Endpoints

### Audio Files

#### Upload Audio File

```http
POST /api/audio/upload
```

**Request Headers:**
```http
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Form Data:**
- `file`: The audio file to upload (WAV, MP3, FLAC)
- `name` (optional): Custom name for the file
- `tags` (optional): Comma-separated tags

**Response:**
```json
{
  "id": "audio_12345",
  "name": "piano_sample.wav",
  "originalName": "piano.wav",
  "format": "wav",
  "duration": 120.5,
  "size": 5242880,
  "url": "/api/audio/audio_12345",
  "createdAt": "2025-03-09T15:30:00Z",
  "tags": ["piano", "classical"]
}
```

#### List Audio Files

```http
GET /api/audio
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sort` (optional): Sort field (default: "createdAt")
- `order` (optional): Sort order ("asc" or "desc", default: "desc")
- `tags` (optional): Filter by tags (comma-separated)

**Response:**
```json
{
  "items": [
    {
      "id": "audio_12345",
      "name": "piano_sample.wav",
      "format": "wav",
      "duration": 120.5,
      "size": 5242880,
      "url": "/api/audio/audio_12345",
      "createdAt": "2025-03-09T15:30:00Z",
      "tags": ["piano", "classical"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### Get Audio File

```http
GET /api/audio/{id}
```

**Response:**
```json
{
  "id": "audio_12345",
  "name": "piano_sample.wav",
  "originalName": "piano.wav",
  "format": "wav",
  "duration": 120.5,
  "size": 5242880,
  "url": "/api/audio/audio_12345",
  "waveformUrl": "/api/audio/audio_12345/waveform",
  "spectrogramUrl": "/api/audio/audio_12345/spectrogram",
  "createdAt": "2025-03-09T15:30:00Z",
  "updatedAt": "2025-03-09T15:30:00Z",
  "tags": ["piano", "classical"],
  "metadata": {
    "sampleRate": 44100,
    "channels": 2,
    "bitDepth": 16
  }
}
```

#### Delete Audio File

```http
DELETE /api/audio/{id}
```

**Response:**
```json
{
  "success": true,
  "message": "Audio file deleted successfully"
}
```

### Processing

#### Process Audio File

```http
POST /api/process/{audioId}
```

**Request Body:**
```json
{
  "operations": [
    {
      "type": "normalize",
      "params": {
        "level": -3,
        "method": "rms"
      }
    },
    {
      "type": "filter",
      "params": {
        "type": "lowpass",
        "frequency": 1000,
        "q": 0.7
      }
    }
  ],
  "outputFormat": "wav"
}
```

**Response:**
```json
{
  "id": "process_67890",
  "status": "processing",
  "progress": 0,
  "estimatedTimeRemaining": 30,
  "createdAt": "2025-03-09T15:35:00Z"
}
```

#### Get Processing Status

```http
GET /api/process/{processId}
```

**Response:**
```json
{
  "id": "process_67890",
  "status": "completed",
  "progress": 100,
  "result": {
    "audioId": "audio_67891",
    "url": "/api/audio/audio_67891"
  },
  "createdAt": "2025-03-09T15:35:00Z",
  "completedAt": "2025-03-09T15:36:00Z"
}
```

### Analysis

#### Extract Features

```http
POST /api/analysis/extract/{audioId}
```

**Request Body:**
```json
{
  "features": ["mfcc", "spectral_centroid", "zero_crossing_rate"],
  "windowSize": 2048,
  "hopSize": 512,
  "sampleRate": 44100
}
```

**Response:**
```json
{
  "id": "analysis_12345",
  "status": "processing",
  "progress": 0,
  "estimatedTimeRemaining": 45,
  "createdAt": "2025-03-09T15:40:00Z"
}
```

#### Get Analysis Results

```http
GET /api/analysis/{analysisId}
```

**Response:**
```json
{
  "id": "analysis_12345",
  "audioId": "audio_12345",
  "status": "completed",
  "features": {
    "mfcc": {
      "mean": [3.5, -2.1, 0.8, ...],
      "std": [1.2, 0.9, 0.5, ...],
      "data": "https://storage.grym-synth.com/analysis/mfcc_12345.json"
    },
    "spectral_centroid": {
      "mean": 2250.5,
      "std": 450.2,
      "data": "https://storage.grym-synth.com/analysis/spectral_12345.json"
    },
    "zero_crossing_rate": {
      "mean": 0.12,
      "std": 0.03,
      "data": "https://storage.grym-synth.com/analysis/zcr_12345.json"
    }
  },
  "createdAt": "2025-03-09T15:40:00Z",
  "completedAt": "2025-03-09T15:41:30Z"
}
```

#### Compare Audio Files

```http
POST /api/analysis/compare
```

**Request Body:**
```json
{
  "audioIds": ["audio_12345", "audio_67891"],
  "features": ["mfcc", "spectral_centroid"],
  "method": "euclidean"
}
```

**Response:**
```json
{
  "id": "comparison_12345",
  "status": "completed",
  "results": {
    "similarity": 0.78,
    "featureComparisons": {
      "mfcc": {
        "similarity": 0.82,
        "distance": 0.18
      },
      "spectral_centroid": {
        "similarity": 0.74,
        "distance": 0.26
      }
    }
  },
  "createdAt": "2025-03-09T15:45:00Z",
  "completedAt": "2025-03-09T15:45:30Z"
}
```

### Models

#### Train Model

```http
POST /api/models/train
```

**Request Body:**
```json
{
  "name": "genre_classifier",
  "type": "classification",
  "features": ["mfcc", "spectral_centroid", "zero_crossing_rate"],
  "trainingData": {
    "audioIds": ["audio_12345", "audio_67891", ...],
    "labels": ["rock", "jazz", ...]
  },
  "parameters": {
    "algorithm": "random_forest",
    "validationSplit": 0.2,
    "randomSeed": 42
  }
}
```

**Response:**
```json
{
  "id": "model_12345",
  "name": "genre_classifier",
  "status": "training",
  "progress": 0,
  "estimatedTimeRemaining": 300,
  "createdAt": "2025-03-09T16:00:00Z"
}
```

#### Get Model Status

```http
GET /api/models/{modelId}
```

**Response:**
```json
{
  "id": "model_12345",
  "name": "genre_classifier",
  "type": "classification",
  "status": "completed",
  "metrics": {
    "accuracy": 0.89,
    "precision": 0.87,
    "recall": 0.86,
    "f1Score": 0.865
  },
  "createdAt": "2025-03-09T16:00:00Z",
  "completedAt": "2025-03-09T16:05:00Z"
}
```

#### Use Model for Prediction

```http
POST /api/models/{modelId}/predict
```

**Request Body:**
```json
{
  "audioId": "audio_54321"
}
```

**Response:**
```json
{
  "prediction": "jazz",
  "confidence": 0.92,
  "alternativePredictions": [
    {
      "label": "fusion",
      "confidence": 0.07
    },
    {
      "label": "blues",
      "confidence": 0.01
    }
  ]
}
```

#### List Models

```http
GET /api/models
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by model type

**Response:**
```json
{
  "items": [
    {
      "id": "model_12345",
      "name": "genre_classifier",
      "type": "classification",
      "status": "completed",
      "accuracy": 0.89,
      "createdAt": "2025-03-09T16:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

### User Management

#### Create User

```http
POST /api/users
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "secure_password",
  "name": "New User",
  "role": "user"
}
```

**Response:**
```json
{
  "id": "user_12345",
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user",
  "createdAt": "2025-03-09T16:30:00Z"
}
```

#### Get Current User

```http
GET /api/users/me
```

**Response:**
```json
{
  "id": "user_12345",
  "email": "user@example.com",
  "name": "Current User",
  "role": "admin",
  "createdAt": "2025-01-01T00:00:00Z",
  "lastLogin": "2025-03-09T15:00:00Z",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

#### Update User

```http
PATCH /api/users/{userId}
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "preferences": {
    "theme": "light"
  }
}
```

**Response:**
```json
{
  "id": "user_12345",
  "email": "user@example.com",
  "name": "Updated Name",
  "role": "admin",
  "preferences": {
    "theme": "light",
    "notifications": true
  }
}
```

## Websocket API

The grym-synth also provides a WebSocket API for real-time updates.

### Connection

```
ws://api.grym-synth.com/ws?token={jwt_token}
```

### Message Format

All messages follow this format:

```json
{
  "type": "message_type",
  "data": {
    // Message-specific data
  }
}
```

### Event Types

#### Processing Updates

```json
{
  "type": "processing_update",
  "data": {
    "id": "process_67890",
    "status": "processing",
    "progress": 45,
    "estimatedTimeRemaining": 15
  }
}
```

#### Analysis Updates

```json
{
  "type": "analysis_update",
  "data": {
    "id": "analysis_12345",
    "status": "processing",
    "progress": 60,
    "estimatedTimeRemaining": 20
  }
}
```

#### Model Training Updates

```json
{
  "type": "model_update",
  "data": {
    "id": "model_12345",
    "status": "training",
    "progress": 75,
    "currentEpoch": 15,
    "totalEpochs": 20,
    "currentMetrics": {
      "accuracy": 0.85,
      "loss": 0.23
    }
  }
}

