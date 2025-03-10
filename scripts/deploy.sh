#!/bin/bash
# Deployment script for Audio Learning Hub
# This script deploys the application to Kubernetes

set -e

# Default values
ENVIRONMENT="development"
NAMESPACE="audio-learning-hub"
KUBE_CONTEXT=""
IMAGE_TAG="latest"
DOCKER_REGISTRY="localhost:5000"
DRY_RUN=false
SKIP_BUILD=false

# Display help message
function show_help {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -e, --environment    Environment (development, staging, production) [default: development]"
  echo "  -n, --namespace      Kubernetes namespace [default: audio-learning-hub]"
  echo "  -c, --context        Kubernetes context [default: current context]"
  echo "  -t, --tag            Image tag [default: latest]"
  echo "  -r, --registry       Docker registry URL [default: localhost:5000]"
  echo "  -d, --dry-run        Perform a dry run without making changes [default: false]"
  echo "  -s, --skip-build     Skip building the Docker image [default: false]"
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
    -n|--namespace)
      NAMESPACE="$2"
      shift
      shift
      ;;
    -c|--context)
      KUBE_CONTEXT="$2"
      shift
      shift
      ;;
    -t|--tag)
      IMAGE_TAG="$2"
      shift
      shift
      ;;
    -r|--registry)
      DOCKER_REGISTRY="$2"
      shift
      shift
      ;;
    -d|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -s|--skip-build)
      SKIP_BUILD=true
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

# Print deployment information
echo "Deploying Audio Learning Hub to Kubernetes"
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
if [ "$DRY_RUN" = true ]; then
  echo "Mode: Dry run (no changes will be made)"
fi

# Build the Docker image if not skipped
if [ "$SKIP_BUILD" = false ]; then
  echo "Building Docker image..."
  if [ "$DRY_RUN" = false ]; then
    ./scripts/build.sh --environment "$ENVIRONMENT" --registry "$DOCKER_REGISTRY" --tag "$IMAGE_TAG" --push
  else
    echo "(Dry run) Would build and push image: $IMAGE_NAME:$IMAGE_TAG"
  fi
else
  echo "Skipping Docker image build"
fi

# Set Kubernetes context if provided
if [ -n "$KUBE_CONTEXT" ]; then
  echo "Setting Kubernetes context to $KUBE_CONTEXT..."
  if [ "$DRY_RUN" = false ]; then
    kubectl config use-context "$KUBE_CONTEXT"
  else
    echo "(Dry run) Would set Kubernetes context to $KUBE_CONTEXT"
  fi
fi

# Create namespace if it doesn't exist
echo "Ensuring namespace $NAMESPACE exists..."
if [ "$DRY_RUN" = false ]; then
  kubectl get namespace "$NAMESPACE" || kubectl create namespace "$NAMESPACE"
else
  echo "(Dry run) Would create namespace $NAMESPACE if it doesn't exist"
fi

# Create ConfigMap for environment variables
echo "Creating ConfigMap for environment variables..."
if [ "$DRY_RUN" = false ]; then
  kubectl create configmap audio-learning-hub-config \
    --namespace "$NAMESPACE" \
    --from-env-file="deployment/env-templates/$ENVIRONMENT.env" \
    --dry-run=client -o yaml | kubectl apply -f -
else
  echo "(Dry run) Would create ConfigMap from $ENVIRONMENT.env"
fi

# Apply Kubernetes manifests using kustomize
echo "Applying Kubernetes manifests..."
if [ "$DRY_RUN" = false ]; then
  # Set environment variables for kustomize
  export ENVIRONMENT="$ENVIRONMENT"
  export DOCKER_REGISTRY="$DOCKER_REGISTRY"
  export IMAGE_TAG="$IMAGE_TAG"

  # Apply manifests
  kubectl apply -k "deployment/kubernetes" --namespace "$NAMESPACE"
else
  echo "(Dry run) Would apply Kubernetes manifests from deployment/kubernetes"
fi

# Wait for deployment to complete
if [ "$DRY_RUN" = false ]; then
  echo "Waiting for deployment to complete..."
  kubectl rollout status deployment/audio-learning-hub --namespace "$NAMESPACE" --timeout=300s

  # Run health check
  echo "Running health check..."
  POD_NAME=$(kubectl get pods --namespace "$NAMESPACE" -l app=audio-learning-hub -o jsonpath="{.items[0].metadata.name}")
  kubectl exec "$POD_NAME" --namespace "$NAMESPACE" -- node scripts/healthcheck.js
else
  echo "(Dry run) Would wait for deployment to complete and run health check"
fi

echo "Deployment completed successfully"
