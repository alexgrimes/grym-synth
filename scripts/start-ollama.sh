#!/bin/bash

# Check if models directory exists and has content
if [ -d "/models" ] && [ "$(ls -A /models)" ]; then
  echo "Model cache directory exists and has content."
else
  echo "Model cache directory is empty or doesn't exist. Creating..."
  mkdir -p /models
fi

# Extract model names from config
models=$(jq -r '.models | keys[]' /etc/ollama/models.json)

# Check and pull models if needed
for model in $models; do
  # Check if model exists in cache
  if [ -d "/models/${model}" ] && [ "$(ls -A /models/${model})" ]; then
    echo "Model ${model} found in cache."
  else
    echo "Model ${model} not found in cache. Pulling..."
    ollama pull ${model}
  fi
done

# Start Ollama service
echo "Starting Ollama service with model cache at /models..."
ollama serve
