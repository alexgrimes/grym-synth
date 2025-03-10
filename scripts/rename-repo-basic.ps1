# rename-repo-basic.ps1
# Basic PowerShell script to clean up the Audio-Learning-Hub repository and rename it to GrymSynth

# Configuration
$OldName = "audio-learning-hub"
$NewName = "GrymSynth"
$OldNameTitle = "Audio Learning Hub"
$NewNameTitle = "GrymSynth"
$ExternalAssetsDir = "..\assets"
$NewRepoDir = "..\$NewName"
$GitHubUsername = ""

# Display section header
Write-Host "`n==========================================================" -ForegroundColor Blue
Write-Host "  Repository Rename: $OldName to $NewName" -ForegroundColor Blue
Write-Host "==========================================================`n" -ForegroundColor Blue

# Confirm the operation
Write-Host "This script will:"
Write-Host "1. Clean the repository by identifying large files"
Write-Host "2. Create a new repository named $NewName"
Write-Host "3. Update all references from $OldName to $NewName"
Write-Host "4. Prepare the repository for GitHub push"
Write-Host ""

$confirmation = Read-Host "Do you want to proceed? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "Operation cancelled by user." -ForegroundColor Red
    exit 1
}

# Step 1: Clean the repository
Write-Host "`n==========================================================" -ForegroundColor Blue
Write-Host "  Step 1: Cleaning the repository" -ForegroundColor Blue
Write-Host "==========================================================`n" -ForegroundColor Blue

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
    Write-Host "The following patterns are missing from .gitignore: $($missingPatterns -join ', ')" -ForegroundColor Yellow
    $addPatterns = Read-Host "Do you want to add these patterns to .gitignore? (y/n)"

    if ($addPatterns -eq 'y') {
        foreach ($pattern in $missingPatterns) {
            Add-Content -Path ".gitignore" -Value $pattern
        }
        Write-Host "Updated .gitignore with missing patterns" -ForegroundColor Green
    }
} else {
    Write-Host ".gitignore is properly configured" -ForegroundColor Green
}

Write-Host "Repository cleaning completed" -ForegroundColor Green

# Step 2: Create a new clean repository with the new name
Write-Host "`n==========================================================" -ForegroundColor Blue
Write-Host "  Step 2: Creating a new clean repository named $NewName" -ForegroundColor Blue
Write-Host "==========================================================`n" -ForegroundColor Blue

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

Write-Host "Files copied to new repository" -ForegroundColor Green

# 2.4: Create a .gitignore file in the new repository
Write-Host "Creating .gitignore in the new repository..."
Copy-Item -Path ".gitignore" -Destination "$NewRepoDir\"

Write-Host "New repository created at $NewRepoDir" -ForegroundColor Green

# Prompt for GitHub username
$GitHubUsername = Read-Host "Enter your GitHub username"

# Step 3: Update all references in the code
Write-Host "`n==========================================================" -ForegroundColor Blue
Write-Host "  Step 3: Updating references from $OldName to $NewName" -ForegroundColor Blue
Write-Host "==========================================================`n" -ForegroundColor Blue

Push-Location $NewRepoDir

# 3.1: Update package.json
Write-Host "Updating package.json..."
if (Test-Path "package.json") {
    (Get-Content package.json) -replace "`"name`": `"$OldName`"", "`"name`": `"$NewName`"" | Set-Content package.json
    (Get-Content package.json) -replace "https://github.com/[^/]*/audio-learning-hub", "https://github.com/$GitHubUsername/$NewName" | Set-Content package.json
    Write-Host "Updated package.json" -ForegroundColor Green
} else {
    Write-Host "package.json not found" -ForegroundColor Yellow
}

# 3.2: Update README.md
Write-Host "Updating README.md..."
if (Test-Path "README.md") {
    (Get-Content README.md) -replace $OldNameTitle, $NewNameTitle | Set-Content README.md
    (Get-Content README.md) -replace $OldName, $NewName | Set-Content README.md
    (Get-Content README.md) -replace "https://github.com/[^/]*/audio-learning-hub", "https://github.com/$GitHubUsername/$NewName" | Set-Content README.md
    Write-Host "Updated README.md" -ForegroundColor Green
} else {
    Write-Host "README.md not found" -ForegroundColor Yellow
}

# 3.3: Update docker-compose.yml
Write-Host "Updating docker-compose.yml..."
if (Test-Path "docker-compose.yml") {
    (Get-Content docker-compose.yml) -replace "container_name: $OldName", "container_name: $NewName" | Set-Content docker-compose.yml
    (Get-Content docker-compose.yml) -replace "container_name: $OldName-test", "container_name: $NewName-test" | Set-Content docker-compose.yml
    (Get-Content docker-compose.yml) -replace "container_name: $OldName-performance", "container_name: $NewName-performance" | Set-Content docker-compose.yml
    (Get-Content docker-compose.yml) -replace "$OldName-network", "$NewName-network" | Set-Content docker-compose.yml
    Write-Host "Updated docker-compose.yml" -ForegroundColor Green
} else {
    Write-Host "docker-compose.yml not found" -ForegroundColor Yellow
}

# 3.4: Update documentation files
Write-Host "Updating documentation files..."
$docFiles = Get-ChildItem -Path "docs" -Recurse -Include "*.md" -ErrorAction SilentlyContinue
foreach ($file in $docFiles) {
    (Get-Content $file.FullName) -replace $OldNameTitle, $NewNameTitle | Set-Content $file.FullName
    (Get-Content $file.FullName) -replace $OldName, $NewName | Set-Content $file.FullName
    (Get-Content $file.FullName) -replace "https://github.com/[^/]*/audio-learning-hub", "https://github.com/$GitHubUsername/$NewName" | Set-Content $file.FullName
}
Write-Host "Updated documentation files" -ForegroundColor Green

Write-Host "Reference updates completed" -ForegroundColor Green
Pop-Location

# Step 4: Prepare for GitHub push
Write-Host "`n==========================================================" -ForegroundColor Blue
Write-Host "  Step 4: Preparing for GitHub push" -ForegroundColor Blue
Write-Host "==========================================================`n" -ForegroundColor Blue

# 4.1: Create initial commit
Write-Host "Creating initial commit..."
Push-Location $NewRepoDir
git add .
git commit -m "Initial commit for $NewName (renamed from $OldName)"
Pop-Location

# 4.2: Provide instructions for creating a GitHub repository
Write-Host ""
Write-Host "To complete the process, follow these steps:"
Write-Host ""
Write-Host "1. Create a new GitHub repository named $NewName at:"
Write-Host "   https://github.com/new"
Write-Host ""
Write-Host "2. Configure the local repository to use the new GitHub repository as remote:"
Write-Host "   cd $NewRepoDir"
Write-Host "   git remote add origin https://github.com/$GitHubUsername/$NewName.git"
Write-Host ""
Write-Host "3. Push the repository to GitHub:"
Write-Host "   git push -u origin main"
Write-Host ""

Write-Host "Repository is ready for GitHub push" -ForegroundColor Green

# Operation completed
Write-Host "`n==========================================================" -ForegroundColor Blue
Write-Host "  Operation completed successfully!" -ForegroundColor Blue
Write-Host "==========================================================`n" -ForegroundColor Blue

Write-Host "The new repository is available at: $NewRepoDir"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review the changes in the new repository"
Write-Host "2. Create a new GitHub repository named $NewName"
Write-Host "3. Push the local repository to GitHub"
Write-Host ""
Write-Host "Thank you for using the repository rename script!"
