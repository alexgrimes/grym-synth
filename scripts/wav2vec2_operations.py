import argparse
import json
import sys
import torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
import soundfile as sf

def load_model(model_name="facebook/wav2vec2-base-960h"):
    """Load wav2vec2 model and processor"""
    processor = Wav2Vec2Processor.from_pretrained(model_name)
    model = Wav2Vec2ForCTC.from_pretrained(model_name)
    
    if torch.cuda.is_available():
        model = model.to("cuda")
    
    return model, processor

def process_audio(audio_path, model, processor):
    """Process audio using wav2vec2"""
    # Load audio
    audio, sample_rate = sf.read(audio_path)
    
    # Process audio
    inputs = processor(audio, sampling_rate=sample_rate, return_tensors="pt")
    
    if torch.cuda.is_available():
        inputs = {key: val.to("cuda") for key, val in inputs.items()}
    
    with torch.no_grad():
        logits = model(**inputs).logits
    
    # Decode
    predicted_ids = torch.argmax(logits, dim=-1)
    transcription = processor.batch_decode(predicted_ids)
    
    return {
        "transcription": transcription[0],
        "confidence": float(torch.max(logits).cpu().numpy())
    }

def analyze_audio(audio_path, model, processor):
    """Extract features from audio using wav2vec2"""
    # Load audio
    audio, sample_rate = sf.read(audio_path)
    
    # Process audio to get features
    inputs = processor(audio, sampling_rate=sample_rate, return_tensors="pt")
    
    if torch.cuda.is_available():
        inputs = {key: val.to("cuda") for key, val in inputs.items()}
    
    with torch.no_grad():
        outputs = model(**inputs, output_hidden_states=True)
    
    # Get last hidden state
    features = outputs.hidden_states[-1].mean(dim=1)
    
    # Convert to list for JSON serialization
    feature_list = features.cpu().numpy().tolist()[0]
    
    return {
        "features": feature_list[:20],  # Return first 20 features as sample
        "feature_count": len(feature_list)
    }

def main():
    parser = argparse.ArgumentParser(description='Wav2Vec2 Operations')
    parser.add_argument('--operation', required=True, choices=['process', 'analyze'])
    parser.add_argument('--audio', required=True, help='Path to audio file')
    parser.add_argument('--request-id', required=True, help='Request ID')
    
    args = parser.parse_args()
    
    try:
        # Load model
        model, processor = load_model()
        
        # Perform operation
        if args.operation == 'process':
            result = process_audio(args.audio, model, processor)
        else:  # analyze
            result = analyze_audio(args.audio, model, processor)
        
        # Add request ID to result
        result['request_id'] = args.request_id
        
        # Return result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error = {
            'error': str(e),
            'request_id': args.request_id
        }
        print(json.dumps(error))
        sys.exit(1)

if __name__ == '__main__':
    main()