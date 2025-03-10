#!/bin/bash

# setup.sh
# Script for first-time setup of the Audio-Learning-Hub project
# This script handles initialization, dependency installation, and asset download

set -e

# Default values
SKIP_DEPS=false
SKIP_ASSETS=false
SKIP_TESTS=false
MINIMAL=false
VERBOSE=false
EXTERNAL_ASSETS_DIR="../assets"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --skip-assets)
      SKIP_ASSETS=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --minimal)
      MINIMAL=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --external-assets-dir)
      EXTERNAL_ASSETS_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./setup.sh [--skip-deps] [--skip-assets] [--skip-tests] [--minimal] [--verbose] [--external-assets-dir <path>]"
      exit 1
      ;;
  esac
done

# Function to print verbose messages
log() {
  if [ "$VERBOSE" = true ]; then
    echo "$@"
  fi
}

# Function to print section headers
section() {
  echo "====================================================================="
  echo "$@"
  echo "====================================================================="
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
  section "Checking system requirements"

  # Check Node.js
  if command_exists node; then
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    echo "✓ Node.js version $NODE_VERSION installed"

    # Check if Node.js version is >= 16.0.0
    if [ "$(printf '%s\n' "16.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "16.0.0" ]; then
      echo "✗ Node.js version must be 16.0.0 or higher"
      exit 1
    fi
  else
    echo "✗ Node.js not found. Please install Node.js 16.0.0 or higher"
    exit 1
  fi

  # Check npm
  if command_exists npm; then
    NPM_VERSION=$(npm -v)
    echo "✓ npm version $NPM_VERSION installed"
  else
    echo "✗ npm not found. Please install npm"
    exit 1
  fi

  # Check Python (required for some models)
  if command_exists python || command_exists python3; then
    PYTHON_CMD="python"
    if ! command_exists python && command_exists python3; then
      PYTHON_CMD="python3"
    fi

    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d ' ' -f 2)
    echo "✓ Python version $PYTHON_VERSION installed"

    # Check if Python version is >= 3.8
    if [ "$(printf '%s\n' "3.8" "$PYTHON_VERSION" | sort -V | head -n1)" != "3.8" ]; then
      echo "⚠ Python version should be 3.8 or higher for optimal compatibility"
    fi
  else
    echo "⚠ Python not found. Some features may not work correctly"
  fi

  # Check disk space
  if command_exists df; then
    FREE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
    echo "✓ Available disk space: $FREE_SPACE"

    # Extract numeric value and unit
    SPACE_VALUE=$(echo "$FREE_SPACE" | sed 's/[^0-9.]//g')
    SPACE_UNIT=$(echo "$FREE_SPACE" | sed 's/[0-9.]//g')

    # Convert to GB for comparison
    case $SPACE_UNIT in
      T|TB) SPACE_GB=$(echo "$SPACE_VALUE * 1024" | bc) ;;
      G|GB) SPACE_GB=$SPACE_VALUE ;;
      M|MB) SPACE_GB=$(echo "$SPACE_VALUE / 1024" | bc) ;;
      K|KB) SPACE_GB=$(echo "$SPACE_VALUE / 1024 / 1024" | bc) ;;
      *) SPACE_GB=0 ;;
    esac

    if (( $(echo "$SPACE_GB < 10" | bc -l) )); then
      echo "⚠ Less than 10GB of free space available. Full setup requires approximately 10GB"
      if [ "$MINIMAL" != true ]; then
        read -p "Continue with full setup? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
          echo "Consider using --minimal flag for a smaller installation"
          exit 1
        fi
      fi
    fi
  else
    echo "⚠ Unable to check available disk space"
  fi

  echo "System requirements check completed"
}

# Function to install dependencies
install_dependencies() {
  if [ "$SKIP_DEPS" = true ]; then
    section "Skipping dependency installation"
    return
  fi

  section "Installing dependencies"

  # Install Node.js dependencies
  echo "Installing Node.js dependencies..."
  npm ci

  # Install Python dependencies if Python is available
  if command_exists python || command_exists python3; then
    PYTHON_CMD="python"
    if ! command_exists python && command_exists python3; then
      PYTHON_CMD="python3"
    fi

    echo "Installing Python dependencies..."
    if [ -f "requirements.txt" ]; then
      $PYTHON_CMD -m pip install -r requirements.txt
    elif [ -f "scripts/requirements.txt" ]; then
      $PYTHON_CMD -m pip install -r scripts/requirements.txt
    else
      echo "⚠ No requirements.txt found, skipping Python dependencies"
    fi
  fi

  echo "Dependencies installed successfully"
}

# Function to set up the external assets directory
setup_external_assets() {
  section "Setting up external assets directory"

  # Create external assets directory if it doesn't exist
  mkdir -p "$EXTERNAL_ASSETS_DIR"

  # Create a manifest file if it doesn't exist
  MANIFEST_FILE="$EXTERNAL_ASSETS_DIR/asset-manifest.json"
  if [ ! -f "$MANIFEST_FILE" ]; then
    echo '{
  "version": "1.0",
  "created": "'"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"'",
  "updated": "'"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"'",
  "assets": []
}' > "$MANIFEST_FILE"
    echo "Created asset manifest at $MANIFEST_FILE"
  else
    echo "Asset manifest already exists at $MANIFEST_FILE"
  fi

  # Create a .gitignore file in the external assets directory
  GITIGNORE_FILE="$EXTERNAL_ASSETS_DIR/.gitignore"
  if [ ! -f "$GITIGNORE_FILE" ]; then
    echo "# Ignore all files in this directory
*
# Except the manifest and this .gitignore file
!asset-manifest.json
!.gitignore
" > "$GITIGNORE_FILE"
    echo "Created .gitignore in external assets directory"
  fi

  echo "External assets directory set up at $EXTERNAL_ASSETS_DIR"
}

# Function to download required assets
download_assets() {
  if [ "$SKIP_ASSETS" = true ]; then
    section "Skipping asset download"
    return
  fi

  section "Downloading required assets"

  # Build the project first to ensure the asset manager is available
  echo "Building project..."
  npm run build

  # Run the asset download script
  if [ "$MINIMAL" = true ]; then
    echo "Downloading minimal required assets..."
    node dist/scripts/download-assets.js --minimal
  else
    echo "Downloading all required assets..."
    node dist/scripts/download-assets.js
  fi

  echo "Assets downloaded successfully"
}

# Function to run tests
run_tests() {
  if [ "$SKIP_TESTS" = true ]; then
    section "Skipping tests"
    return
  fi

  section "Running tests"

  # Run basic tests to verify setup
  echo "Running basic tests..."
  npm test -- --testPathIgnorePatterns=integration --testPathIgnorePatterns=system

  echo "Tests completed successfully"
}

# Main setup process
main() {
  section "Starting Audio-Learning-Hub setup"

  # Record start time
  START_TIME=$(date +%s)

  # Check system requirements
  check_requirements

  # Set up external assets directory
  setup_external_assets

  # Install dependencies
  install_dependencies

  # Download required assets
  download_assets

  # Run tests
  run_tests

  # Calculate elapsed time
  END_TIME=$(date +%s)
  ELAPSED=$((END_TIME - START_TIME))
  MINUTES=$((ELAPSED / 60))
  SECONDS=$((ELAPSED % 60))

  section "Setup completed in ${MINUTES}m ${SECONDS}s"

  echo "Audio-Learning-Hub is now ready to use!"
  echo ""
  echo "To start the development server:"
  echo "  npm run dev"
  echo ""
  echo "For more information, see the documentation:"
  echo "  - README.md: General information"
  echo "  - docs/GETTING-STARTED.md: Getting started guide"
  echo "  - docs/ASSETS.md: Information about external assets"
  echo ""
}

# Run the main function
main
