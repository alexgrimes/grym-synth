#!/bin/bash

# rename-repo.sh
# Script to clean up the Audio-Learning-Hub repository and rename it to GrymSynth
# This script handles:
# 1. Cleaning the repository of large files
# 2. Creating a new clean repository with the new name
# 3. Updating all references in the code
# 4. Preparing for GitHub push

set -e  # Exit on any error

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OLD_NAME="audio-learning-hub"
NEW_NAME="GrymSynth"
OLD_NAME_TITLE="Audio Learning Hub"
NEW_NAME_TITLE="GrymSynth"
EXTERNAL_ASSETS_DIR="../assets"  # Default external assets directory
TEMP_DIR="/tmp/repo-rename-$$"   # Temporary directory for the operation
NEW_REPO_DIR="../$NEW_NAME"      # Path for the new repository
GITHUB_USERNAME=""               # Will be prompted later

# Function to display section headers
section() {
    echo -e "\n${BLUE}===========================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}===========================================================${NC}\n"
}

# Function to display success messages
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to display warning messages
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to display error messages and exit
error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# Function to prompt for confirmation
confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Operation cancelled by user."
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required commands
check_requirements() {
    section "Checking requirements"

    local missing_commands=()

    for cmd in git find grep sed awk jq; do
        if ! command_exists "$cmd"; then
            missing_commands+=("$cmd")
        fi
    done

    if [ ${#missing_commands[@]} -ne 0 ]; then
        error "Missing required commands: ${missing_commands[*]}"
    fi

    success "All required commands are available"
}

# Step 1: Clean the repository
clean_repository() {
    section "Step 1: Cleaning the repository"

    # 1.1: Identify large files
    echo "Identifying large files (> 10MB)..."
    ./scripts/identify-large-files.sh 10 .

    # 1.2: Confirm and move large files to external storage
    echo
    confirm "Do you want to move large files to external storage?"

    echo "Moving large files to external storage..."
    ./scripts/clean-repo.sh 10 . "$EXTERNAL_ASSETS_DIR"

    # 1.3: Verify .gitignore is properly configured
    echo "Verifying .gitignore configuration..."

    # Check if common large file patterns are in .gitignore
    local missing_patterns=()
    for pattern in "assets/" "*.weights" "*.pt" "*.pth" "*.onnx" "*.bin" "*.wav" "*.mp3" "*.mp4"; do
        if ! grep -q "$pattern" .gitignore; then
            missing_patterns+=("$pattern")
        fi
    done

    if [ ${#missing_patterns[@]} -ne 0 ]; then
        warning "The following patterns are missing from .gitignore: ${missing_patterns[*]}"
        confirm "Do you want to add these patterns to .gitignore?"

        for pattern in "${missing_patterns[@]}"; do
            echo "$pattern" >> .gitignore
        done
        success "Updated .gitignore with missing patterns"
    else
        success ".gitignore is properly configured"
    fi

    # 1.4: Check repository size after cleaning
    echo "Checking repository size after cleaning..."
    local repo_size=$(du -sh . | cut -f1)
    echo "Current repository size: $repo_size"

    success "Repository cleaning completed"
}

# Step 2: Create a new clean repository with the new name
create_new_repository() {
    section "Step 2: Creating a new clean repository named $NEW_NAME"

    # 2.1: Create a new directory for the new repository
    echo "Creating new repository directory at $NEW_REPO_DIR..."
    mkdir -p "$NEW_REPO_DIR"

    # 2.2: Initialize a new git repository
    echo "Initializing new git repository..."
    cd "$NEW_REPO_DIR"
    git init

    # 2.3: Copy all files from the current repository (excluding .git directory and large files)
    echo "Copying files from the old repository..."
    cd - > /dev/null  # Return to original directory

    # Create a temporary file with patterns to exclude
    local exclude_file="$TEMP_DIR/exclude-patterns"
    mkdir -p "$TEMP_DIR"
    cat > "$exclude_file" << EOF
.git/
node_modules/
assets/
external-assets/
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
EOF

    # Use rsync to copy files, excluding patterns in the exclude file
    if command_exists rsync; then
        rsync -av --exclude-from="$exclude_file" . "$NEW_REPO_DIR/"
    else
        # Fallback to cp if rsync is not available
        warning "rsync not found, using cp instead (less efficient)"
        find . -type f -not -path "*/\.*" | grep -v -f "$exclude_file" | xargs -I{} cp --parents {} "$NEW_REPO_DIR/"
    fi

    success "Files copied to new repository"

    # 2.4: Create a .gitignore file in the new repository
    echo "Creating .gitignore in the new repository..."
    cp .gitignore "$NEW_REPO_DIR/"

    success "New repository created at $NEW_REPO_DIR"
}

# Step 3: Update all references in the code
update_references() {
    section "Step 3: Updating references from $OLD_NAME to $NEW_NAME"

    cd "$NEW_REPO_DIR"

    # 3.1: Update package.json
    echo "Updating package.json..."
    if [ -f "package.json" ]; then
        sed -i "s/\"name\": \"$OLD_NAME\"/\"name\": \"$NEW_NAME\"/g" package.json
        sed -i "s|https://github.com/[^/]*/audio-learning-hub|https://github.com/$GITHUB_USERNAME/$NEW_NAME|g" package.json
        success "Updated package.json"
    else
        warning "package.json not found"
    fi

    # 3.2: Update README.md
    echo "Updating README.md..."
    if [ -f "README.md" ]; then
        sed -i "s/$OLD_NAME_TITLE/$NEW_NAME_TITLE/g" README.md
        sed -i "s/$OLD_NAME/$NEW_NAME/g" README.md
        sed -i "s|https://github.com/[^/]*/audio-learning-hub|https://github.com/$GITHUB_USERNAME/$NEW_NAME|g" README.md
        success "Updated README.md"
    else
        warning "README.md not found"
    fi

    # 3.3: Update docker-compose.yml
    echo "Updating docker-compose.yml..."
    if [ -f "docker-compose.yml" ]; then
        sed -i "s/container_name: $OLD_NAME/container_name: $NEW_NAME/g" docker-compose.yml
        sed -i "s/container_name: $OLD_NAME-test/container_name: $NEW_NAME-test/g" docker-compose.yml
        sed -i "s/container_name: $OLD_NAME-performance/container_name: $NEW_NAME-performance/g" docker-compose.yml
        sed -i "s/$OLD_NAME-network/$NEW_NAME-network/g" docker-compose.yml
        success "Updated docker-compose.yml"
    else
        warning "docker-compose.yml not found"
    fi

    # 3.4: Update import statements in TypeScript/JavaScript files
    echo "Updating import statements in TypeScript/JavaScript files..."
    find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i "s/from ['\"]\(.\+\/\)\?$OLD_NAME/from '\1$NEW_NAME/g" {} \;
    find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i "s/import ['\"]\(.\+\/\)\?$OLD_NAME/import '\1$NEW_NAME/g" {} \;
    find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i "s/require(['\"]\(.\+\/\)\?$OLD_NAME)/require('\1$NEW_NAME)/g" {} \;
    success "Updated import statements"

    # 3.5: Update documentation files
    echo "Updating documentation files..."
    find ./docs -type f -name "*.md" -exec sed -i "s/$OLD_NAME_TITLE/$NEW_NAME_TITLE/g" {} \;
    find ./docs -type f -name "*.md" -exec sed -i "s/$OLD_NAME/$NEW_NAME/g" {} \;
    find ./docs -type f -name "*.md" -exec sed -i "s|https://github.com/[^/]*/audio-learning-hub|https://github.com/$GITHUB_USERNAME/$NEW_NAME|g" {} \;
    success "Updated documentation files"

    # 3.6: Update any other references
    echo "Searching for other references to $OLD_NAME..."
    grep -r --include="*.{json,yaml,yml,md,txt,html,css,ts,js,jsx,tsx}" "$OLD_NAME" . || true

    echo
    warning "Some references might still need manual updating. Check the output above."
    echo "You can use: grep -r \"$OLD_NAME\" . to find any remaining references."

    success "Reference updates completed"
}

# Step 4: Prepare for GitHub push
prepare_for_github() {
    section "Step 4: Preparing for GitHub push"

    # 4.1: Prompt for GitHub username if not provided
    if [ -z "$GITHUB_USERNAME" ]; then
        read -p "Enter your GitHub username: " GITHUB_USERNAME
        if [ -z "$GITHUB_USERNAME" ]; then
            error "GitHub username is required"
        fi
    fi

    # 4.2: Create initial commit
    echo "Creating initial commit..."
    git add .
    git commit -m "Initial commit for $NEW_NAME (renamed from $OLD_NAME)"

    # 4.3: Provide instructions for creating a GitHub repository
    echo
    echo "To complete the process, follow these steps:"
    echo
    echo "1. Create a new GitHub repository named '$NEW_NAME' at:"
    echo "   https://github.com/new"
    echo
    echo "2. Configure the local repository to use the new GitHub repository as remote:"
    echo "   cd $NEW_REPO_DIR"
    echo "   git remote add origin https://github.com/$GITHUB_USERNAME/$NEW_NAME.git"
    echo
    echo "3. Push the repository to GitHub:"
    echo "   git push -u origin main"
    echo

    success "Repository is ready for GitHub push"
}

# Main execution
main() {
    section "Repository Rename: $OLD_NAME → $NEW_NAME"

    # Check requirements
    check_requirements

    # Confirm the operation
    echo "This script will:"
    echo "1. Clean the repository by moving large files to external storage"
    echo "2. Create a new repository named '$NEW_NAME'"
    echo "3. Update all references from '$OLD_NAME' to '$NEW_NAME'"
    echo "4. Prepare the repository for GitHub push"
    echo
    confirm "Do you want to proceed?"

    # Execute the steps
    clean_repository
    create_new_repository

    # Prompt for GitHub username
    read -p "Enter your GitHub username: " GITHUB_USERNAME

    update_references
    prepare_for_github

    section "Operation completed successfully!"
    echo "The new repository is available at: $NEW_REPO_DIR"
    echo
    echo "Next steps:"
    echo "1. Review the changes in the new repository"
    echo "2. Create a new GitHub repository named '$NEW_NAME'"
    echo "3. Push the local repository to GitHub"
    echo
    echo "Thank you for using the repository rename script!"
}

# Run the main function
main
