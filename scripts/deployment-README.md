# Deployment Scripts

This directory contains scripts for building, deploying, and monitoring the Audio Learning Hub application.

## Scripts Overview

### Build Script (`build.sh`)

The build script creates Docker images for different environments.

**Usage:**
```bash
./scripts/build.sh [options]
```

**Options:**
- `-e, --environment`: Environment (development, staging, production) [default: development]
- `-r, --registry`: Docker registry URL [default: localhost:5000]
- `-t, --tag`: Image tag [default: latest]
- `-p, --push`: Push image to registry [default: false]
- `-h, --help`: Show help message

**Examples:**
```bash
# Build development image
./scripts/build.sh

# Build production image with specific tag and push to registry
./scripts/build.sh --environment production --registry acr.azure.com/mycompany --tag v1.0.0 --push
```

### Deploy Script (`deploy.sh`)

The deploy script deploys the application to Kubernetes.

**Usage:**
```bash
./scripts/deploy.sh [options]
```

**Options:**
- `-e, --environment`: Environment (development, staging, production) [default: development]
- `-n, --namespace`: Kubernetes namespace [default: audio-learning-hub]
- `-c, --context`: Kubernetes context [default: current context]
- `-t, --tag`: Image tag [default: latest]
- `-r, --registry`: Docker registry URL [default: localhost:5000]
- `-d, --dry-run`: Perform a dry run without making changes [default: false]
- `-s, --skip-build`: Skip building the Docker image [default: false]
- `-h, --help`: Show help message

**Examples:**
```bash
# Deploy to development environment
./scripts/deploy.sh

# Deploy to production with specific namespace and registry
./scripts/deploy.sh --environment production --namespace prod-audio --registry acr.azure.com/mycompany --tag v1.0.0

# Perform a dry run for staging environment
./scripts/deploy.sh --environment staging --dry-run
```

### Health Check Script (`healthcheck.js`)

The health check script verifies the health of the deployed application.

**Usage:**
```bash
node scripts/healthcheck.js
```

**Environment Variables:**
- `HEALTH_CHECK_ENDPOINT`: Health check endpoint [default: /health]
- `HEALTH_CHECK_HOST`: Host to check [default: localhost]
- `PORT`: Port to check [default: 3000]
- `HEALTH_CHECK_PROTOCOL`: Protocol (http or https) [default: http]
- `HEALTH_CHECK_TIMEOUT`: Timeout in milliseconds [default: 5000]
- `HEALTH_CHECK_DISK_SPACE`: Whether to check disk space [default: true]
- `HEALTH_CHECK_MIN_DISK_SPACE`: Minimum required disk space in MB [default: 100]
- `HEALTH_CHECK_MEMORY`: Whether to check memory usage [default: true]
- `HEALTH_CHECK_MAX_MEMORY_USAGE`: Maximum allowed memory usage in percentage [default: 90]
- `HEALTH_CHECK_CPU`: Whether to check CPU usage [default: true]
- `HEALTH_CHECK_MAX_CPU_USAGE`: Maximum allowed CPU usage in percentage [default: 90]
- `HEALTH_CHECK_FILES`: Whether to check for required files [default: true]
- `HEALTH_CHECK_REQUIRED_FILES`: Comma-separated list of required files [default: dist/index.js]
- `HEALTH_CHECK_VERBOSE`: Enable verbose output [default: false]

**Examples:**
```bash
# Run health check with default settings
node scripts/healthcheck.js

# Run health check with custom settings
HEALTH_CHECK_VERBOSE=true HEALTH_CHECK_TIMEOUT=10000 node scripts/healthcheck.js
```

## CI/CD Integration

These scripts are designed to be used in CI/CD pipelines. Here's an example of how they can be integrated:

### GitHub Actions Example

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ secrets.REGISTRY_URL }}
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}

    - name: Build and push Docker image
      run: |
        chmod +x ./scripts/build.sh
        ./scripts/build.sh --environment ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }} \
                          --registry ${{ secrets.REGISTRY_URL }} \
                          --tag ${{ github.sha }} \
                          --push

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3

    - name: Set up kubectl
      uses: azure/setup-kubectl@v3

    - name: Set Kubernetes context
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.KUBE_CONFIG }}

    - name: Deploy to Kubernetes
      run: |
        chmod +x ./scripts/deploy.sh
        ./scripts/deploy.sh --environment production \
                           --namespace audio-learning-hub \
                           --registry ${{ secrets.REGISTRY_URL }} \
                           --tag ${{ github.sha }} \
                           --skip-build
```

### Azure DevOps Example

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  environment: $[eq(variables['Build.SourceBranch'], 'refs/heads/main'), 'production', 'staging']
  registryUrl: $(REGISTRY_URL)
  imageTag: $(Build.BuildId)

stages:
- stage: Build
  jobs:
  - job: BuildImage
    steps:
    - task: Bash@3
      inputs:
        filePath: './scripts/build.sh'
        arguments: '--environment $(environment) --registry $(registryUrl) --tag $(imageTag) --push'

- stage: Deploy
  dependsOn: Build
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - job: DeployToKubernetes
    steps:
    - task: Kubernetes@1
      inputs:
        connectionType: 'Kubernetes Service Connection'
        kubernetesServiceEndpoint: 'KubernetesConnection'
        command: 'login'

    - task: Bash@3
      inputs:
        filePath: './scripts/deploy.sh'
        arguments: '--environment $(environment) --namespace audio-learning-hub --registry $(registryUrl) --tag $(imageTag) --skip-build'
```

## Troubleshooting

### Common Issues

1. **Permission denied when running scripts**:
   ```bash
   chmod +x ./scripts/build.sh ./scripts/deploy.sh
   ```

2. **Docker build fails**:
   - Check Docker daemon is running
   - Ensure you have sufficient disk space
   - Verify Dockerfile syntax

3. **Kubernetes deployment fails**:
   - Check kubectl configuration: `kubectl config current-context`
   - Verify namespace exists: `kubectl get namespace`
   - Check for existing resources: `kubectl get all -n <namespace>`

4. **Health check fails**:
   - Verify the application is running: `kubectl get pods -n <namespace>`
   - Check pod logs: `kubectl logs <pod-name> -n <namespace>`
   - Ensure the health endpoint is implemented correctly
