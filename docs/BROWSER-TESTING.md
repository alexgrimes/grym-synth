# Audio Learning Verification Tests

## Overview
Simple browser-based tests to verify the audio learning system's ability to learn and improve pattern recognition over multiple exposures to the same audio.

## Running Tests

1. Start the test server:
```bash
node src/tests/browser/serve.js
```

2. Open in your browser:
```
http://localhost:3001
```

3. Run the learning verification test:
   - Select an audio file
   - Click "Test Learning"
   - Review the learning progression results

## Test Process

### What's Being Tested

1. Initial Pattern Recognition
   - Audio file processing
   - Pattern extraction
   - Initial recognition metrics

2. Learning Verification
   - Second pass processing
   - Pattern recognition improvement
   - Confidence level changes

### Success Criteria

The test passes if the second processing of the same audio shows:
- Improved pattern recognition rate
- Increased confidence levels
- Faster processing time

## Example Results

```json
{
  "firstRun": {
    "patternRecognitionRate": 0.75,
    "averageConfidence": 0.80,
    "patterns": [
      {
        "id": "pattern_1",
        "confidence": 0.80
      }
    ]
  },
  "secondRun": {
    "patternRecognitionRate": 0.85,
    "averageConfidence": 0.90,
    "patterns": [
      {
        "id": "pattern_1",
        "confidence": 0.90
      }
    ]
  }
}
```

## Test Audio Files

For consistent testing, use:
- Duration: 2-5 seconds
- Format: WAV (44.1kHz, 16-bit)
- Content: Simple patterns (e.g., single notes, basic rhythms)

## Troubleshooting

### Audio Context Issues
```javascript
// If audio doesn't start, check:
console.log(audioContext.state);
// Should be 'running', not 'suspended'
```

### Common Problems

1. No Audio Processing
   - Check file format
   - Verify audio context state
   - Check browser console for errors

2. No Learning Progress
   - Verify file is actually processed twice
   - Check pattern extraction success
   - Monitor memory usage

3. Browser Compatibility
   - Verify Web Audio API support
   - Check for required AudioContext features
   - Test in latest Chrome/Firefox

## Browser Requirements

- Modern browser with Web Audio API support
- Sufficient memory (>4GB recommended)
- Stable audio input/output configuration

## Privacy Note

Test files are processed locally in the browser and are not uploaded to any server.
