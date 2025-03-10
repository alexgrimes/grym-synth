@echo off
setlocal enabledelayedexpansion

:: rename-repo.bat
:: Script to clean up the Audio-Learning-Hub repository and rename it to GrymSynth
:: This script handles:
:: 1. Cleaning the repository of large files
:: 2. Creating a new clean repository with the new name
:: 3. Updating all references in the code
:: 4. Preparing for GitHub push

:: Color codes for better readability
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: Configuration
set "OLD_NAME=audio-learning-hub"
set "NEW_NAME=GrymSynth"
set "OLD_NAME_TITLE=Audio Learning Hub"
set "NEW_NAME_TITLE=GrymSynth"
set "EXTERNAL_ASSETS_DIR=..\assets"
set "TEMP_DIR=%TEMP%\repo-rename-%RANDOM%"
set "NEW_REPO_DIR=..\%NEW_NAME%"
set "GITHUB_USERNAME="

:: Function to display section headers
:section
echo.
echo %BLUE%==========================================================%NC%
echo %BLUE%  %~1%NC%
echo %BLUE%==========================================================%NC%
echo.
goto :eof

:: Function to display success messages
:success
echo %GREEN%✓ %~1%NC%
goto :eof

:: Function to display warning messages
:warning
echo %YELLOW%⚠ %~1%NC%
goto :eof

:: Function to display error messages and exit
:error
echo %RED%✗ %~1%NC%
exit /b 1

:: Function to prompt for confirmation
:confirm
set /p "REPLY=%~1 (y/n): "
if /i not "%REPLY%"=="y" (
    call :error "Operation cancelled by user."
    exit /b 1
)
goto :eof

:: Function to check if a command exists
:command_exists
where %~1 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    set /a MISSING_COUNT+=1
    set "MISSING_COMMANDS=!MISSING_COMMANDS! %~1"
)
goto :eof

:: Check for required commands
:check_requirements
call :section "Checking requirements"

set "MISSING_COUNT=0"
set "MISSING_COMMANDS="

call :command_exists git
call :command_exists find
call :command_exists grep
call :command_exists sed
call :command_exists jq

if %MISSING_COUNT% neq 0 (
    call :error "Missing required commands:%MISSING_COMMANDS%"
    echo You may need to install Git for Windows which includes these tools.
    echo Download from: https://git-scm.com/download/win
    exit /b 1
)

call :success "All required commands are available"
goto :eof

:: Step 1: Clean the repository
:clean_repository
call :section "Step 1: Cleaning the repository"

:: 1.1: Identify large files
echo Identifying large files ^(^> 10MB^)...
call scripts\identify-large-files.sh 10 .

:: 1.2: Confirm and move large files to external storage
echo.
call :confirm "Do you want to move large files to external storage?"

echo Moving large files to external storage...
call scripts\clean-repo.sh 10 . "%EXTERNAL_ASSETS_DIR%"

:: 1.3: Verify .gitignore is properly configured
echo Verifying .gitignore configuration...

:: Check if common large file patterns are in .gitignore
set "MISSING_PATTERNS="
set "MISSING_COUNT=0"

for %%p in (assets/ *.weights *.pt *.pth *.onnx *.bin *.wav *.mp3 *.mp4) do (
    findstr /c:"%%p" .gitignore >nul
    if %ERRORLEVEL% neq 0 (
        set /a MISSING_COUNT+=1
        set "MISSING_PATTERNS=!MISSING_PATTERNS! %%p"
    )
)

if %MISSING_COUNT% neq 0 (
    call :warning "The following patterns are missing from .gitignore:%MISSING_PATTERNS%"
    call :confirm "Do you want to add these patterns to .gitignore?"

    for %%p in (%MISSING_PATTERNS%) do (
        echo %%p >> .gitignore
    )
    call :success "Updated .gitignore with missing patterns"
) else (
    call :success ".gitignore is properly configured"
)

:: 1.4: Check repository size after cleaning
echo Checking repository size after cleaning...
for /f "tokens=1,2" %%a in ('dir /s /-c . ^| findstr "bytes"') do (
    set "REPO_SIZE=%%a %%b"
)
echo Current repository size: %REPO_SIZE%

call :success "Repository cleaning completed"
goto :eof

:: Step 2: Create a new clean repository with the new name
:create_new_repository
call :section "Step 2: Creating a new clean repository named %NEW_NAME%"

:: 2.1: Create a new directory for the new repository
echo Creating new repository directory at %NEW_REPO_DIR%...
if not exist "%NEW_REPO_DIR%" mkdir "%NEW_REPO_DIR%"

:: 2.2: Initialize a new git repository
echo Initializing new git repository...
pushd "%NEW_REPO_DIR%"
git init
popd

:: 2.3: Copy all files from the current repository (excluding .git directory and large files)
echo Copying files from the old repository...

:: Create a temporary file with patterns to exclude
set "EXCLUDE_FILE=%TEMP_DIR%\exclude-patterns.txt"
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

(
echo .git\
echo node_modules\
echo assets\
echo external-assets\
echo *.weights
echo *.pt
echo *.pth
echo *.onnx
echo *.tflite
echo *.pb
echo *.h5
echo *.hdf5
echo *.pkl
echo *.joblib
echo *.bin
echo *.wav
echo *.mp3
echo *.mp4
echo *.avi
echo *.mov
echo *.mkv
echo *.flac
echo *.ogg
echo *.aac
echo *.zip
echo *.tar
echo *.tar.gz
echo *.tgz
echo *.rar
echo *.7z
echo *.iso
) > "%EXCLUDE_FILE%"

:: Use robocopy to copy files, excluding patterns in the exclude file
echo Copying files with robocopy...
robocopy . "%NEW_REPO_DIR%" /E /XD .git node_modules assets external-assets /XF *.weights *.pt *.pth *.onnx *.tflite *.pb *.h5 *.hdf5 *.pkl *.joblib *.bin *.wav *.mp3 *.mp4 *.avi *.mov *.mkv *.flac *.ogg *.aac *.zip *.tar *.tar.gz *.tgz *.rar *.7z *.iso

call :success "Files copied to new repository"

:: 2.4: Create a .gitignore file in the new repository
echo Creating .gitignore in the new repository...
copy .gitignore "%NEW_REPO_DIR%\"

call :success "New repository created at %NEW_REPO_DIR%"
goto :eof

:: Step 3: Update all references in the code
:update_references
call :section "Step 3: Updating references from %OLD_NAME% to %NEW_NAME%"

pushd "%NEW_REPO_DIR%"

:: 3.1: Update package.json
echo Updating package.json...
if exist "package.json" (
    powershell -Command "(Get-Content package.json) -replace '\"name\": \"%OLD_NAME%\"', '\"name\": \"%NEW_NAME%\"' | Set-Content package.json"
    powershell -Command "(Get-Content package.json) -replace 'https://github.com/[^/]*/audio-learning-hub', 'https://github.com/%GITHUB_USERNAME%/%NEW_NAME%' | Set-Content package.json"
    call :success "Updated package.json"
) else (
    call :warning "package.json not found"
)

:: 3.2: Update README.md
echo Updating README.md...
if exist "README.md" (
    powershell -Command "(Get-Content README.md) -replace '%OLD_NAME_TITLE%', '%NEW_NAME_TITLE%' | Set-Content README.md"
    powershell -Command "(Get-Content README.md) -replace '%OLD_NAME%', '%NEW_NAME%' | Set-Content README.md"
    powershell -Command "(Get-Content README.md) -replace 'https://github.com/[^/]*/audio-learning-hub', 'https://github.com/%GITHUB_USERNAME%/%NEW_NAME%' | Set-Content README.md"
    call :success "Updated README.md"
) else (
    call :warning "README.md not found"
)

:: 3.3: Update docker-compose.yml
echo Updating docker-compose.yml...
if exist "docker-compose.yml" (
    powershell -Command "(Get-Content docker-compose.yml) -replace 'container_name: %OLD_NAME%', 'container_name: %NEW_NAME%' | Set-Content docker-compose.yml"
    powershell -Command "(Get-Content docker-compose.yml) -replace 'container_name: %OLD_NAME%-test', 'container_name: %NEW_NAME%-test' | Set-Content docker-compose.yml"
    powershell -Command "(Get-Content docker-compose.yml) -replace 'container_name: %OLD_NAME%-performance', 'container_name: %NEW_NAME%-performance' | Set-Content docker-compose.yml"
    powershell -Command "(Get-Content docker-compose.yml) -replace '%OLD_NAME%-network', '%NEW_NAME%-network' | Set-Content docker-compose.yml"
    call :success "Updated docker-compose.yml"
) else (
    call :warning "docker-compose.yml not found"
)

:: 3.4: Update import statements in TypeScript/JavaScript files
echo Updating import statements in TypeScript/JavaScript files...
for /r %%f in (*.ts *.tsx *.js *.jsx) do (
    powershell -Command "(Get-Content '%%f') -replace 'from [''\""](.+\/)?%OLD_NAME%', 'from ''$1%NEW_NAME%' | Set-Content '%%f'"
    powershell -Command "(Get-Content '%%f') -replace 'import [''\""](.+\/)?%OLD_NAME%', 'import ''$1%NEW_NAME%' | Set-Content '%%f'"
    powershell -Command "(Get-Content '%%f') -replace 'require\([''\""](.+\/)?%OLD_NAME%\)', 'require(''$1%NEW_NAME%)' | Set-Content '%%f'"
)
call :success "Updated import statements"

:: 3.5: Update documentation files
echo Updating documentation files...
for /r %%f in (docs\*.md) do (
    powershell -Command "(Get-Content '%%f') -replace '%OLD_NAME_TITLE%', '%NEW_NAME_TITLE%' | Set-Content '%%f'"
    powershell -Command "(Get-Content '%%f') -replace '%OLD_NAME%', '%NEW_NAME%' | Set-Content '%%f'"
    powershell -Command "(Get-Content '%%f') -replace 'https://github.com/[^/]*/audio-learning-hub', 'https://github.com/%GITHUB_USERNAME%/%NEW_NAME%' | Set-Content '%%f'"
)
call :success "Updated documentation files"

:: 3.6: Update any other references
echo Searching for other references to %OLD_NAME%...
findstr /s /i /m "%OLD_NAME%" *.json *.yaml *.yml *.md *.txt *.html *.css *.ts *.js *.jsx *.tsx

echo.
call :warning "Some references might still need manual updating. Check the output above."
echo You can use: findstr /s /i /m "%OLD_NAME%" *.* to find any remaining references.

call :success "Reference updates completed"
popd
goto :eof

:: Step 4: Prepare for GitHub push
:prepare_for_github
call :section "Step 4: Preparing for GitHub push"

:: 4.1: Prompt for GitHub username if not provided
if "%GITHUB_USERNAME%"=="" (
    set /p "GITHUB_USERNAME=Enter your GitHub username: "
    if "%GITHUB_USERNAME%"=="" (
        call :error "GitHub username is required"
        exit /b 1
    )
)

:: 4.2: Create initial commit
echo Creating initial commit...
pushd "%NEW_REPO_DIR%"
git add .
git commit -m "Initial commit for %NEW_NAME% (renamed from %OLD_NAME%)"
popd

:: 4.3: Provide instructions for creating a GitHub repository
echo.
echo To complete the process, follow these steps:
echo.
echo 1. Create a new GitHub repository named '%NEW_NAME%' at:
echo    https://github.com/new
echo.
echo 2. Configure the local repository to use the new GitHub repository as remote:
echo    cd %NEW_REPO_DIR%
echo    git remote add origin https://github.com/%GITHUB_USERNAME%/%NEW_NAME%.git
echo.
echo 3. Push the repository to GitHub:
echo    git push -u origin main
echo.

call :success "Repository is ready for GitHub push"
goto :eof

:: Main execution
:main
call :section "Repository Rename: %OLD_NAME% → %NEW_NAME%"

:: Check requirements
call :check_requirements

:: Confirm the operation
echo This script will:
echo 1. Clean the repository by moving large files to external storage
echo 2. Create a new repository named '%NEW_NAME%'
echo 3. Update all references from '%OLD_NAME%' to '%NEW_NAME%'
echo 4. Prepare the repository for GitHub push
echo.
call :confirm "Do you want to proceed?"

:: Execute the steps
call :clean_repository
call :create_new_repository

:: Prompt for GitHub username
set /p "GITHUB_USERNAME=Enter your GitHub username: "

call :update_references
call :prepare_for_github

call :section "Operation completed successfully!"
echo The new repository is available at: %NEW_REPO_DIR%
echo.
echo Next steps:
echo 1. Review the changes in the new repository
echo 2. Create a new GitHub repository named '%NEW_NAME%'
echo 3. Push the local repository to GitHub
echo.
echo Thank you for using the repository rename script!

exit /b 0

:: Start the script
call :main
