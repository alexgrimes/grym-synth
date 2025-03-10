# Memory testing PowerShell script
param(
    [switch]$Debug,
    [switch]$Profile,
    [string]$ReportDir = "reports/memory"
)

# Create reports directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

# First build the test files
Write-Host "Building test files..."
& "$PSScriptRoot/build-tests.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}

# Set Node.js options
$NodeOptions = @("--expose-gc", "--max-old-space-size=16384")

if ($Debug) {
    $NodeOptions += "--inspect-brk"
    Write-Host "Running in debug mode. Attach debugger to continue..."
}

if ($Profile) {
    $NodeOptions += "--prof"
    Write-Host "Running with V8 profiling enabled..."
}

Write-Host "`nRunning memory tests..."
Write-Host "Memory limit: 16GB"
Write-Host "Report directory: $ReportDir`n"

# Ensure we're using the compiled test files
$TestScript = Join-Path $PSScriptRoot "../../../dist-test/lib/testing/run-memory-tests.js"

try {
    $NodeArgs = $NodeOptions + @($TestScript)
    & node $NodeArgs

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Memory tests failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }

    Write-Host "`nMemory tests completed successfully"
    Write-Host "Reports generated in $ReportDir"

    # If profiling was enabled, process the V8 profile
    if ($Profile) {
        Write-Host "`nProcessing V8 profile..."
        & node --prof-process isolate-*-v8.log > "$ReportDir/v8-profile.txt"
        Remove-Item isolate-*-v8.log
        Write-Host "V8 profile saved to $ReportDir/v8-profile.txt"
    }

    # Run memory analysis
    Write-Host "`nAnalyzing memory usage..."
    $AnalysisScript = Join-Path $PSScriptRoot "../../../dist-test/lib/testing/analyze-report.js"
    & node $NodeOptions $AnalysisScript

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Memory analysis failed"
        exit $LASTEXITCODE
    }
} catch {
    Write-Error "Error running memory tests: $_"
    exit 1
}