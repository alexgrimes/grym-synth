# Ollama Service with NVIDIA GPU support
FROM ollama/ollama:latest

# Install required utilities
RUN apt-get update && apt-get install -y \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Copy model configuration
COPY model-config.json /etc/ollama/models.json

# Create startup script
COPY start-ollama.sh /start-ollama.sh
RUN chmod +x /start-ollama.sh

# Configure environment variables
ENV OLLAMA_HOST=0.0.0.0 \
    OLLAMA_MODELS_PATH=/models \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    NVIDIA_VISIBLE_DEVICES=all

# Create volume mount points for model persistence
VOLUME ["/models"]

# Expose API port
EXPOSE 11434

# Start the service
ENTRYPOINT ["/start-ollama.sh"]
