# Build TypeScript files for testing
Write-Host "Building test files..."

# Create dist-test directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "dist-test" | Out-Null

# Clean previous build
if (Test-Path "dist-test") {
    Write-Host "Cleaning previous build..."
    Remove-Item -Recurse -Force "dist-test"
}

# Build TypeScript files using test configuration
Write-Host "Compiling TypeScript files..."
& npx tsc --project tsconfig.test.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build completed successfully"
    
    # Copy necessary non-TypeScript files
    Write-Host "Copying additional files..."
    if (Test-Path "src/lib/testing/audio-model/jest.setup.ts") {
        Copy-Item "src/lib/testing/audio-model/jest.setup.ts" -Destination "dist-test/lib/testing/audio-model/"
    }
    
    Write-Host "Test files ready for execution"
    exit 0
} else {
    Write-Error "Build failed with exit code $LASTEXITCODE"
    exit 1
}