#!/usr/bin/env python
import argparse
import json
import sys
import os
import base64
import time
import torch
import numpy as np
from transformers import T5EncoderModel
from audioldm import AudioLDM
import soundfile as sf
from io import BytesIO

def load_model(model_path, quantization='8bit', use_half_precision=True):
    """Load AudioLDM model with memory optimizations"""
    try:
        # Configure quantization
        quantization_config = None
        if quantization == '8bit':
            from transformers import BitsAndBytesConfig
            quantization_config = BitsAndBytesConfig(load_in_8bit=True)
        elif quantization == '4bit':
            from transformers import BitsAndBytesConfig
            quantization_config = BitsAndBytesConfig(load_in_4bit=True)
        
        # Initialize model with optimizations
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Create model with memory optimizations
        model = AudioLDM(
            model_path=model_path,
            device=device, 
            quantization_config=quantization_config
        )
        
        # Apply half precision if requested and not using quantization
        if use_half_precision and quantization == 'none' and device == 'cuda':
            model = model.half()
        
        # Apply gradient checkpointing to reduce memory usage
        if hasattr(model, 'enable_gradient_checkpointing'):
            model.enable_gradient_checkpointing()
        
        return model
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

def generate_audio(model, prompt, 
                  output_dir, 
                  output_name='generated_audio',
                  steps=25, 
                  guidance_scale=3.5, 
                  batch_size=1, 
                  duration=5.0, 
                  sample_rate=16000):
    """Generate audio from text prompt"""
    try:
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Configure generation parameters
        output_path = os.path.join(output_dir, f"{output_name}.wav")
        
        # Generate audio using AudioLDM
        waveform = model.generate(
            text=prompt,
            guidance_scale=guidance_scale,
            num_inference_steps=steps,
            duration=duration,
            num_waveforms_per_prompt=batch_size
        )
        
        # Save audio to file
        sf.write(output_path, waveform[0], sample_rate)
        
        return {
            "path": output_path,
            "sample_rate": sample_rate,
            "duration": duration
        }
        
    except Exception as e:
        return {"error": str(e)}

def read_audio_file(file_path):
    """Read audio file and return encoded data for passing back to Node"""
    try:
        audio, sample_rate = sf.read(file_path)
        
        # Convert to mono if stereo
        if len(audio.shape) > 1 and audio.shape[1] > 1:
            audio = np.mean(audio, axis=1)
        
        # Convert to float32
        audio = audio.astype(np.float32)
        
        # Calculate duration
        duration = len(audio) / sample_rate
        
        # Convert to base64 for JSON transfer
        buffer = BytesIO()
        np.save(buffer, audio)
        encoded = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return {
            "audio_data": encoded,
            "sample_rate": sample_rate,
            "duration": duration
        }
        
    except Exception as e:
        return {"error": str(e)}

def test_environment():
    """Test that the environment is properly configured"""
    try:
        # Check GPU availability
        cuda_available = torch.cuda.is_available()
        gpu_info = {}
        
        if cuda_available:
            gpu_info = {
                "name": torch.cuda.get_device_name(0),
                "mem_total": torch.cuda.get_device_properties(0).total_memory,
                "mem_allocated": torch.cuda.memory_allocated(0),
                "cuda_version": torch.version.cuda
            }
        
        return {
            "status": "ok",
            "python_version": sys.version,
            "pytorch_version": torch.__version__,
            "cuda_available": cuda_available,
            "gpu_info": gpu_info
        }
        
    except Exception as e:
        return {"error": str(e)}

def main():
    parser = argparse.ArgumentParser(description='AudioLDM Operations')
    parser.add_argument('--operation', required=True, 
                       choices=['test-env', 'load-model', 'generate', 'read-audio'])
    parser.add_argument('--request-id', required=True, help='Request ID')
    parser.add_argument('--params', required=True, help='Parameters as JSON string')
    
    args = parser.parse_args()
    params = json.loads(args.params)
    
    try:
        result = {}
        
        # Execute requested operation
        if args.operation == 'test-env':
            result = test_environment()
            
        elif args.operation == 'load-model':
            model = load_model(
                params.get('model_path', 'latent-diffusion/audioldm-s-full'),
                params.get('quantization', '8bit'),
                params.get('use_half_precision', True)
            )
            result = {"status": "Model loaded successfully"}
            
        elif args.operation == 'generate':
            model = load_model(
                params.get('model_path', 'latent-diffusion/audioldm-s-full'),
                params.get('quantization', '8bit'),
                params.get('use_half_precision', True)
            )
            result = generate_audio(
                model,
                params.get('prompt', ''),
                params.get('output_dir', './output'),
                params.get('output_name', 'audio'),
                params.get('steps', 25),
                params.get('guidance_scale', 3.5),
                params.get('batch_size', 1),
                params.get('duration', 5.0),
                params.get('sample_rate', 16000)
            )
            
        elif args.operation == 'read-audio':
            result = read_audio_file(params.get('file_path', ''))
            
        # Add request ID to result
        result['request_id'] = args.request_id
        
        # Print result as JSON
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