# rename-repo-simple.ps1
# PowerShell script to clean up the Audio-Learning-Hub repository and rename it to GrymSynth

# Configuration
$OldName = "audio-learning-hub"
$NewName = "GrymSynth"
$OldNameTitle = "Audio Learning Hub"
$NewNameTitle = "GrymSynth"
$ExternalAssetsDir = "..\assets"
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

# Step 1: Clean the repository
function Clean-Repository {
    Show-Section "Step 1: Cleaning the repository"

    # 1.1: Identify large files
    Write-Host "Identifying large files (> 10MB)..."

    # Find files larger than 10MB
    $largeFiles = Get-ChildItem -Path . -Recurse -File |
                  Where-Object {
                      $_.Length -gt 10MB -and
                      $_.FullName -notlike "*\node_modules\*" -and
                      $_.FullName -notlike "*\.git\*"
                  } |
                  Sort-Object -Property Length -Descending

    # Display the large files
    foreach ($file in $largeFiles) {
        $sizeInMB = [math]::Round($file.Length / 1MB, 2)
        Write-Host "$sizeInMB MB $($file.FullName)"
    }

    # 1.2: Verify .gitignore is properly configured
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

    Show-Success "Repository cleaning completed"
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

    # 3.4: Update documentation files
    Write-Host "Updating documentation files..."
    $docFiles = Get-ChildItem -Path "docs" -Recurse -Include "*.md" -ErrorAction SilentlyContinue
    foreach ($file in $docFiles) {
        (Get-Content $file.FullName) -replace $OldNameTitle, $NewNameTitle | Set-Content $file.FullName
        (Get-Content $file.FullName) -replace $OldName, $NewName | Set-Content $file.FullName
        (Get-Content $file.FullName) -replace "https://github.com/[^/]*/audio-learning-hub", "https://github.com/$GitHubUsername/$NewName" | Set-Content $file.FullName
    }
    Show-Success "Updated documentation files"

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
    Write-Host "1. Create a new GitHub repository named ""$NewName"" at:"
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
    Show-Section "Repository Rename: $OldName to $NewName"

    # Confirm the operation
    Write-Host "This script will:"
    Write-Host "1. Clean the repository by moving large files to external storage"
    Write-Host "2. Create a new repository named ""$NewName"""
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
    Write-Host "2. Create a new GitHub repository named ""$NewName"""
    Write-Host "3. Push the local repository to GitHub"
    Write-Host ""
    Write-Host "Thank you for using the repository rename script!"
}

# Run the main function
Main
