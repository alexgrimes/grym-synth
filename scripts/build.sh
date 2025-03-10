#!/bin/bash
# Build script for Audio Learning Hub
# This script builds Docker images for different environments

set -e

# Default values
ENVIRONMENT="development"
DOCKER_REGISTRY="localhost:5000"
IMAGE_TAG="latest"
PUSH_IMAGE=false

# Display help message
function show_help {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -e, --environment    Environment (development, staging, production) [default: development]"
  echo "  -r, --registry       Docker registry URL [default: localhost:5000]"
  echo "  -t, --tag            Image tag [default: latest]"
  echo "  -p, --push           Push image to registry [default: false]"
  echo "  -h, --help           Show this help message"
  exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -e|--environment)
      ENVIRONMENT="$2"
      shift
      shift
      ;;
    -r|--registry)
      DOCKER_REGISTRY="$2"
      shift
      shift
      ;;
    -t|--tag)
      IMAGE_TAG="$2"
      shift
      shift
      ;;
    -p|--push)
      PUSH_IMAGE=true
      shift
      ;;
    -h|--help)
      show_help
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      ;;
  esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Error: Invalid environment. Must be one of: development, staging, production"
  exit 1
fi

# Set image name
IMAGE_NAME="$DOCKER_REGISTRY/audio-learning-hub"

# Print build information
echo "Building Audio Learning Hub Docker image"
echo "Environment: $ENVIRONMENT"
echo "Image: $IMAGE_NAME:$IMAGE_TAG"

# Copy appropriate environment file
echo "Copying $ENVIRONMENT environment configuration..."
cp "deployment/env-templates/$ENVIRONMENT.env" .env

# Build the Docker image
echo "Building Docker image..."
docker build \
  --build-arg ENVIRONMENT=$ENVIRONMENT \
  --build-arg NODE_ENV=$([[ "$ENVIRONMENT" == "development" ]] && echo "development" || echo "production") \
  -t "$IMAGE_NAME:$IMAGE_TAG" \
  -t "$IMAGE_NAME:$ENVIRONMENT" \
  .

# Remove temporary .env file
rm .env

# Push the image if requested
if [ "$PUSH_IMAGE" = true ]; then
  echo "Pushing image to registry..."
  docker push "$IMAGE_NAME:$IMAGE_TAG"
  docker push "$IMAGE_NAME:$ENVIRONMENT"
  echo "Image pushed successfully"
fi

echo "Build completed successfully"
