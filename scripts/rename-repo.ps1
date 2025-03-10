# rename-repo.ps1
# PowerShell script to clean up the Audio-Learning-Hub repository and rename it to GrymSynth
# This script handles:
# 1. Cleaning the repository of large files
# 2. Creating a new clean repository with the new name
# 3. Updating all references in the code
# 4. Preparing for GitHub push

# Configuration
$OldName = "audio-learning-hub"
$NewName = "GrymSynth"
$OldNameTitle = "Audio Learning Hub"
$NewNameTitle = "GrymSynth"
$ExternalAssetsDir = "..\assets"
$TempDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "repo-rename-$([Guid]::NewGuid().ToString())")
$NewRepoDir = "..\$NewName"
$GitHubUsername = ""

# Function to display section headers
function Show-Section {
    param([string]$Title)

    Write-Host "`n==========================================================" -ForegroundColor Blue
    Write-Host "  $Title" -ForegroundColor Blue
    Write-Host "==========================================================`n" -ForegroundColor Blue
}

# Function to display success messages
function Show-Success {
    param([string]$Message)

    Write-Host "✓ $Message" -ForegroundColor Green
}

# Function to display warning messages
function Show-Warning {
    param([string]$Message)

    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

# Function to display error messages and exit
function Show-Error {
    param([string]$Message)

    Write-Host "✗ $Message" -ForegroundColor Red
    exit 1
}

# Function to prompt for confirmation
function Confirm-Action {
    param([string]$Prompt)

    $confirmation = Read-Host "$Prompt (y/n)"
    if ($confirmation -ne 'y') {
        Show-Error "Operation cancelled by user."
    }
}

# Function to check if a command exists
function Test-Command {
    param([string]$Command)

    $exists = Get-Command $Command -ErrorAction SilentlyContinue
    return ($null -ne $exists)
}

# Check for required commands
function Test-Requirements {
    Show-Section "Checking requirements"

    $missingCommands = @()

    foreach ($cmd in @("git")) {
        if (-not (Test-Command $cmd)) {
            $missingCommands += $cmd
        }
    }

    if ($missingCommands.Count -gt 0) {
        Show-Error "Missing required commands: $($missingCommands -join ', ')"
    }

    Show-Success "All required commands are available"
}

# Step 1: Clean the repository
function Clean-Repository {
    Show-Section "Step 1: Cleaning the repository"

    # 1.1: Identify large files
    Write-Host "Identifying large files (> 10MB)..."

    # Check if we can use the shell script
    if (Test-Path "scripts\identify-large-files.sh") {
        # Try to use Git Bash if available
        if (Test-Command "bash") {
            bash scripts/identify-large-files.sh 10 .
        } else {
            # Fallback to PowerShell implementation
            Write-Host "Shell script execution not available. Using PowerShell implementation."
            Find-LargeFiles -SizeThresholdMB 10 -Directory "."
        }
    } else {
        # Fallback to PowerShell implementation
        Find-LargeFiles -SizeThresholdMB 10 -Directory "."
    }

    # 1.2: Confirm and move large files to external storage
    Write-Host ""
    Confirm-Action "Do you want to move large files to external storage?"

    Write-Host "Moving large files to external storage..."

    # Check if we can use the shell script
    if (Test-Path "scripts\clean-repo.sh") {
        # Try to use Git Bash if available
        if (Test-Command "bash") {
            bash scripts/clean-repo.sh 10 . "$ExternalAssetsDir"
        } else {
            # Fallback to PowerShell implementation
            Write-Host "Shell script execution not available. Using PowerShell implementation."
            Move-LargeFiles -SizeThresholdMB 10 -SourceDir "." -TargetDir $ExternalAssetsDir
        }
    } else {
        # Fallback to PowerShell implementation
        Move-LargeFiles -SizeThresholdMB 10 -SourceDir "." -TargetDir $ExternalAssetsDir
    }

    # 1.3: Verify .gitignore is properly configured
    Write-Host "Verifying .gitignore configuration..."

    # Check if common large file patterns are in .gitignore
    $missingPatterns = @()
    foreach ($pattern in @("assets/", "*.weights", "*.pt", "*.pth", "*.onnx", "*.bin", "*.wav", "*.mp3", "*.mp4")) {
        if (-not (Select-String -Path ".gitignore" -Pattern $pattern -Quiet)) {
            $missingPatterns += $pattern
        }
    }

    if ($missingPatterns.Count -gt 0) {
        Show-Warning "The following patterns are missing from .gitignore: $($missingPatterns -join ', ')"
        Confirm-Action "Do you want to add these patterns to .gitignore?"

        foreach ($pattern in $missingPatterns) {
            Add-Content -Path ".gitignore" -Value $pattern
        }
        Show-Success "Updated .gitignore with missing patterns"
    } else {
        Show-Success ".gitignore is properly configured"
    }

    # 1.4: Check repository size after cleaning
    Write-Host "Checking repository size after cleaning..."
    $repoSize = Get-FolderSize -Path "."
    Write-Host "Current repository size: $repoSize"

    Show-Success "Repository cleaning completed"
}

# PowerShell implementation to find large files
function Find-LargeFiles {
    param(
        [int]$SizeThresholdMB = 10,
        [string]$Directory = "."
    )

    $sizeThresholdBytes = $SizeThresholdMB * 1MB

    Write-Host "Searching for files larger than ${SizeThresholdMB}MB in ${Directory}..."
    Write-Host "----------------------------------------------------------------------"

    # Find files larger than the threshold and sort by size (largest first)
    $largeFiles = Get-ChildItem -Path $Directory -Recurse -File |
                  Where-Object {
                      $_.Length -gt $sizeThresholdBytes -and
                      $_.FullName -notlike "*\node_modules\*" -and
                      $_.FullName -notlike "*\.git\*"
                  } |
                  Sort-Object -Property Length -Descending

    # Display the large files
    foreach ($file in $largeFiles) {
        $sizeInMB = [math]::Round($file.Length / 1MB, 2)
        Write-Host "$sizeInMB MB $($file.FullName)"
    }

    Write-Host "----------------------------------------------------------------------"
    Write-Host "Summary of file types exceeding ${SizeThresholdMB}MB:"
    Write-Host "----------------------------------------------------------------------"

    # Group by extension
    $largeFiles | Group-Object -Property Extension | Sort-Object -Property Count -Descending | ForEach-Object {
        Write-Host "$($_.Count) $($_.Name)"
    }

    Write-Host "----------------------------------------------------------------------"
    Write-Host "Directories containing large files:"
    Write-Host "----------------------------------------------------------------------"

    # Group by directory
    $largeFiles | Group-Object -Property DirectoryName | Sort-Object -Property Count -Descending | ForEach-Object {
        Write-Host "$($_.Count) $($_.Name)"
    }

    Write-Host "----------------------------------------------------------------------"
    Write-Host "Recommendation for .gitignore:"
    Write-Host "----------------------------------------------------------------------"

    # Generate recommended .gitignore entries
    $largeFiles | Group-Object -Property DirectoryName | ForEach-Object {
        $relativePath = $_.Name.Replace((Get-Location).Path + "\", "")
        Write-Host "$relativePath/"
    }

    Write-Host "----------------------------------------------------------------------"
}

# PowerShell implementation to move large files
function Move-LargeFiles {
    param(
        [int]$SizeThresholdMB = 10,
        [string]$SourceDir = ".",
        [string]$TargetDir = "..\assets"
    )

    $sizeThresholdBytes = $SizeThresholdMB * 1MB

    # Ensure target directory exists
    if (-not (Test-Path $TargetDir)) {
        New-Item -Path $TargetDir -ItemType Directory -Force | Out-Null
    }

    # Get absolute paths
    $SourceDir = (Resolve-Path $SourceDir).Path
    $TargetDir = (Resolve-Path $TargetDir).Path

    Write-Host "Moving files larger than ${SizeThresholdMB}MB from ${SourceDir} to ${TargetDir}..."
    Write-Host "----------------------------------------------------------------------"

    # Find files larger than the threshold
    $largeFiles = Get-ChildItem -Path $SourceDir -Recurse -File |
                  Where-Object {
                      $_.Length -gt $sizeThresholdBytes -and
                      $_.FullName -notlike "*\node_modules\*" -and
                      $_.FullName -notlike "*\.git\*"
                  }

    # Count the number of files to move
    $fileCount = $largeFiles.Count
    Write-Host "Found $fileCount files larger than ${SizeThresholdMB}MB"

    if ($fileCount -eq 0) {
        Write-Host "No files to move. Exiting."
        return
    }

    # Create a manifest file to track moved files
    $manifestFile = Join-Path $TargetDir "asset-manifest.json"
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

    # Initialize manifest if it doesn't exist
    if (-not (Test-Path $manifestFile)) {
        @{
            version = "1.0"
            created = $timestamp
            updated = $timestamp
            assets = @()
        } | ConvertTo-Json -Depth 10 | Set-Content $manifestFile
    } else {
        # Update the timestamp in the existing manifest
        $manifest = Get-Content $manifestFile | ConvertFrom-Json
        $manifest.updated = $timestamp
        $manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestFile
    }

    # Process each file
    $movedCount = 0
    $totalSize = 0
    $manifest = Get-Content $manifestFile | ConvertFrom-Json

    foreach ($file in $largeFiles) {
        # Skip if file doesn't exist (might have been moved already)
        if (-not (Test-Path $file.FullName)) {
            continue
        }

        # Calculate relative path from source directory
        $relPath = $file.FullName.Replace($SourceDir + "\", "")

        # Create target directory structure
        $targetFileDir = Join-Path $TargetDir (Split-Path $relPath)
        if (-not (Test-Path $targetFileDir)) {
            New-Item -Path $targetFileDir -ItemType Directory -Force | Out-Null
        }

        # Get file size before moving
        $fileSize = $file.Length
        $totalSize += $fileSize

        # Calculate checksum
        $checksum = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash

        # Move the file
        $targetFilePath = Join-Path $targetFileDir $file.Name
        Move-Item -Path $file.FullName -Destination $targetFilePath -Force

        # Create a placeholder file with information about the moved file
        $placeholder = "$($file.FullName).asset-ref"
        @"
# This file has been moved to the external assets directory
# Original path: $($file.FullName)
# Current location: $targetFilePath
# Size: $([math]::Round($fileSize / 1MB, 2)) MB
# SHA256: $checksum
# Moved on: $timestamp
#
# To restore this file, use the asset manager:
# npm run assets:restore $relPath
"@ | Set-Content $placeholder

        # Add entry to manifest
        $assetEntry = @{
            originalPath = $relPath
            storagePath = $targetFilePath.Replace(($TargetDir + "\"), "")
            size = $fileSize
            checksum = $checksum
            movedOn = $timestamp
            required = $true
        }

        $manifest.assets += $assetEntry

        Write-Host "Moved: $relPath ($([math]::Round($fileSize / 1MB, 2)) MB)"
        $movedCount++
    }

    # Update the manifest file
    $manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestFile

    Write-Host "----------------------------------------------------------------------"
    Write-Host "Summary:"
    Write-Host "- Moved $movedCount files"
    Write-Host "- Total size: $([math]::Round($totalSize / 1MB, 2)) MB"
    Write-Host "- Assets stored in: $TargetDir"
    Write-Host "- Manifest file: $manifestFile"
    Write-Host "----------------------------------------------------------------------"
    Write-Host "To restore these files, implement the asset manager as specified in the documentation."
    Write-Host "----------------------------------------------------------------------"

    # Suggest adding the target directory to .gitignore if it's not already there
    $targetDirName = Split-Path $TargetDir -Leaf
    if (-not (Select-String -Path ".gitignore" -Pattern "^$targetDirName/$" -Quiet)) {
        Write-Host "Consider adding the following line to your .gitignore file:"
        Write-Host "$targetDirName/"
    }
}

# Get folder size in human-readable format
function Get-FolderSize {
    param([string]$Path = ".")

    $size = (Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum

    if ($size -gt 1GB) {
        return "$([math]::Round($size / 1GB, 2)) GB"
    } elseif ($size -gt 1MB) {
        return "$([math]::Round($size / 1MB, 2)) MB"
    } elseif ($size -gt 1KB) {
        return "$([math]::Round($size / 1KB, 2)) KB"
    } else {
        return "$size bytes"
    }
}

# Step 2: Create a new clean repository with the new name
function Create-NewRepository {
    Show-Section "Step 2: Creating a new clean repository named $NewName"

    # 2.1: Create a new directory for the new repository
    Write-Host "Creating new repository directory at $NewRepoDir..."
    if (-not (Test-Path $NewRepoDir)) {
        New-Item -Path $NewRepoDir -ItemType Directory -Force | Out-Null
    }

    # 2.2: Initialize a new git repository
    Write-Host "Initializing new git repository..."
    Push-Location $NewRepoDir
    git init
    Pop-Location

    # 2.3: Copy all files from the current repository (excluding .git directory and large files)
    Write-Host "Copying files from the old repository..."

    # Create a temporary file with patterns to exclude
    $excludeFile = Join-Path $TempDir "exclude-patterns.txt"
    if (-not (Test-Path $TempDir)) {
        New-Item -Path $TempDir -ItemType Directory -Force | Out-Null
    }

    @"
.git\
node_modules\
assets\
external-assets\
*.weights
*.pt
*.pth
*.onnx
*.tflite
*.pb
*.h5
*.hdf5
*.pkl
*.joblib
*.bin
*.wav
*.mp3
*.mp4
*.avi
*.mov
*.mkv
*.flac
*.ogg
*.aac
*.zip
*.tar
*.tar.gz
*.tgz
*.rar
*.7z
*.iso
"@ | Set-Content $excludeFile

    # Use robocopy to copy files, excluding patterns in the exclude file
    Write-Host "Copying files with robocopy..."
    $robocopyArgs = @(
        ".",
        $NewRepoDir,
        "/E",
        "/XD", ".git", "node_modules", "assets", "external-assets",
        "/XF", "*.weights", "*.pt", "*.pth", "*.onnx", "*.tflite", "*.pb", "*.h5", "*.hdf5", "*.pkl", "*.joblib", "*.bin", "*.wav", "*.mp3", "*.mp4", "*.avi", "*.mov", "*.mkv", "*.flac", "*.ogg", "*.aac", "*.zip", "*.tar", "*.tar.gz", "*.tgz", "*.rar", "*.7z", "*.iso"
    )

    & robocopy $robocopyArgs

    Show-Success "Files copied to new repository"

    # 2.4: Create a .gitignore file in the new repository
    Write-Host "Creating .gitignore in the new repository..."
    Copy-Item -Path ".gitignore" -Destination "$NewRepoDir\"

    Show-Success "New repository created at $NewRepoDir"
}

# Step 3: Update all references in the code
function Update-References {
    Show-Section "Step 3: Updating references from $OldName to $NewName"

    Push-Location $NewRepoDir

    # 3.1: Update package.json
    Write-Host "Updating package.json..."
    if (Test-Path "package.json") {
        (Get-Content package.json) -replace "`"name`": `"$OldName`"", "`"name`": `"$NewName`"" | Set-Content package.json
        (Get-Content package.json) -replace "https://github.com/[^/]*/audio-learning-hub", "https://github.com/$GitHubUsername/$NewName" | Set-Content package.json
        Show-Success "Updated package.json"
    } else {
        Show-Warning "package.json not found"
    }

    # 3.2: Update README.md
    Write-Host "Updating README.md..."
    if (Test-Path "README.md") {
        (Get-Content README.md) -replace $OldNameTitle, $NewNameTitle | Set-Content README.md
        (Get-Content README.md) -replace $OldName, $NewName | Set-Content README.md
        (Get-Content README.md) -replace "https://github.com/[^/]*/audio-learning-hub", "https://github.com/$GitHubUsername/$NewName" | Set-Content README.md
        Show-Success "Updated README.md"
    } else {
        Show-Warning "README.md not found"
    }

    # 3.3: Update docker-compose.yml
    Write-Host "Updating docker-compose.yml..."
    if (Test-Path "docker-compose.yml") {
        (Get-Content docker-compose.yml) -replace "container_name: $OldName", "container_name: $NewName" | Set-Content docker-compose.yml
        (Get-Content docker-compose.yml) -replace "container_name: $OldName-test", "container_name: $NewName-test" | Set-Content docker-compose.yml
        (Get-Content docker-compose.yml) -replace "container_name: $OldName-performance", "container_name: $NewName-performance" | Set-Content docker-compose.yml
        (Get-Content docker-compose.yml) -replace "$OldName-network", "$NewName-network" | Set-Content docker-compose.yml
        Show-Success "Updated docker-compose.yml"
    } else {
        Show-Warning "docker-compose.yml not found"
    }

    # 3.4: Update import statements in TypeScript/JavaScript files
    Write-Host "Updating import statements in TypeScript/JavaScript files..."
    $tsFiles = Get-ChildItem -Path . -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx"
    foreach ($file in $tsFiles) {
        (Get-Content $file.FullName) -replace "from ['\`"](.+\/)?$OldName", "from '$1$NewName" | Set-Content $file.FullName
        (Get-Content $file.FullName) -replace "import ['\`"](.+\/)?$OldName", "import '$1$NewName" | Set-Content $file.FullName
        (Get-Content $file.FullName) -replace "require\(['\`"](.+\/)?$OldName\)", "require('$1$NewName)" | Set-Content $file.FullName
    }
    Show-Success "Updated import statements"

    # 3.5: Update documentation files
    Write-Host "Updating documentation files..."
    $docFiles = Get-ChildItem -Path "docs" -Recurse -Include "*.md" -ErrorAction SilentlyContinue
    foreach ($file in $docFiles) {
        (Get-Content $file.FullName) -replace $OldNameTitle, $NewNameTitle | Set-Content $file.FullName
        (Get-Content $file.FullName) -replace $OldName, $NewName | Set-Content $file.FullName
        (Get-Content $file.FullName) -replace "https://github.com/[^/]*/audio-learning-hub", "https://github.com/$GitHubUsername/$NewName" | Set-Content $file.FullName
    }
    Show-Success "Updated documentation files"

    # 3.6: Update any other references
    Write-Host "Searching for other references to $OldName..."
    $otherFiles = Get-ChildItem -Path . -Recurse -Include "*.json", "*.yaml", "*.yml", "*.md", "*.txt", "*.html", "*.css", "*.ts", "*.js", "*.jsx", "*.tsx" | Select-String -Pattern $OldName -List
    foreach ($file in $otherFiles) {
        Write-Host $file.Path
    }

    Write-Host ""
    Show-Warning "Some references might still need manual updating. Check the output above."
    Write-Host "You can use: Select-String -Path '.\*' -Pattern '$OldName' -Recurse to find any remaining references."

    Show-Success "Reference updates completed"
    Pop-Location
}

# Step 4: Prepare for GitHub push
function Prepare-ForGitHub {
    Show-Section "Step 4: Preparing for GitHub push"

    # 4.1: Prompt for GitHub username if not provided
    if ([string]::IsNullOrEmpty($GitHubUsername)) {
        $GitHubUsername = Read-Host "Enter your GitHub username"
        if ([string]::IsNullOrEmpty($GitHubUsername)) {
            Show-Error "GitHub username is required"
        }
    }

    # 4.2: Create initial commit
    Write-Host "Creating initial commit..."
    Push-Location $NewRepoDir
    git add .
    git commit -m "Initial commit for $NewName (renamed from $OldName)"
    Pop-Location

    # 4.3: Provide instructions for creating a GitHub repository
    Write-Host ""
    Write-Host "To complete the process, follow these steps:"
    Write-Host ""
    Write-Host "1. Create a new GitHub repository named '$NewName' at:"
    Write-Host "   https://github.com/new"
    Write-Host ""
    Write-Host "2. Configure the local repository to use the new GitHub repository as remote:"
    Write-Host "   cd $NewRepoDir"
    Write-Host "   git remote add origin https://github.com/$GitHubUsername/$NewName.git"
    Write-Host ""
    Write-Host "3. Push the repository to GitHub:"
    Write-Host "   git push -u origin main"
    Write-Host ""

    Show-Success "Repository is ready for GitHub push"
}

# Main execution
function Main {
    Show-Section "Repository Rename: $OldName → $NewName"

    # Check requirements
    Test-Requirements

    # Confirm the operation
    Write-Host "This script will:"
    Write-Host "1. Clean the repository by moving large files to external storage"
    Write-Host "2. Create a new repository named '$NewName'"
    Write-Host "3. Update all references from '$OldName' to '$NewName'"
    Write-Host "4. Prepare the repository for GitHub push"
    Write-Host ""
    Confirm-Action "Do you want to proceed?"

    # Execute the steps
    Clean-Repository
    Create-NewRepository

    # Prompt for GitHub username
    $GitHubUsername = Read-Host "Enter your GitHub username"

    Update-References
    Prepare-ForGitHub

    Show-Section "Operation completed successfully!"
    Write-Host "The new repository is available at: $NewRepoDir"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Review the changes in the new repository"
    Write-Host "2. Create a new GitHub repository named '$NewName'"
    Write-Host "3. Push the local repository to GitHub"
    Write-Host ""
    Write-Host "Thank you for using the repository rename script!"
}

# Run the main function
Main
