#!/bin/bash

# clean-repo.sh
# Script to safely move large files to a designated directory structure outside the repository
# Usage: ./clean-repo.sh [size_in_mb] [source_directory] [target_directory]

set -e

# Default values
SIZE_THRESHOLD=${1:-10}        # Default to 10MB if not specified
SOURCE_DIR=${2:-.}             # Default to current directory if not specified
TARGET_DIR=${3:-../assets}     # Default to ../assets if not specified

# Ensure target directory exists
mkdir -p "$TARGET_DIR"

# Absolute paths for clarity
SOURCE_DIR=$(realpath "$SOURCE_DIR")
TARGET_DIR=$(realpath "$TARGET_DIR")

echo "Moving files larger than ${SIZE_THRESHOLD}MB from ${SOURCE_DIR} to ${TARGET_DIR}..."
echo "----------------------------------------------------------------------"

# Create a temporary file to store the list of files to move
TEMP_FILE=$(mktemp)

# Find files larger than the threshold
find "$SOURCE_DIR" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -size +${SIZE_THRESHOLD}M > "$TEMP_FILE"

# Count the number of files to move
FILE_COUNT=$(wc -l < "$TEMP_FILE")
echo "Found $FILE_COUNT files larger than ${SIZE_THRESHOLD}MB"

if [ "$FILE_COUNT" -eq 0 ]; then
    echo "No files to move. Exiting."
    rm "$TEMP_FILE"
    exit 0
fi

# Ask for confirmation
read -p "Do you want to proceed with moving these files? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Operation cancelled."
    rm "$TEMP_FILE"
    exit 0
fi

# Create a manifest file to track moved files
MANIFEST_FILE="$TARGET_DIR/asset-manifest.json"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Initialize manifest if it doesn't exist
if [ ! -f "$MANIFEST_FILE" ]; then
    echo '{
  "version": "1.0",
  "created": "'"$TIMESTAMP"'",
  "updated": "'"$TIMESTAMP"'",
  "assets": []
}' > "$MANIFEST_FILE"
else
    # Update the timestamp in the existing manifest
    sed -i 's/"updated": "[^"]*"/"updated": "'"$TIMESTAMP"'"/' "$MANIFEST_FILE"
fi

# Process each file
MOVED_COUNT=0
TOTAL_SIZE=0
MANIFEST_TEMP=$(mktemp)

# Extract the assets array from the manifest
jq '.assets' "$MANIFEST_FILE" > "$MANIFEST_TEMP"

while IFS= read -r FILE; do
    # Skip if file doesn't exist (might have been moved already)
    [ ! -f "$FILE" ] && continue

    # Calculate relative path from source directory
    REL_PATH=$(realpath --relative-to="$SOURCE_DIR" "$FILE")

    # Create target directory structure
    TARGET_FILE_DIR="$TARGET_DIR/$(dirname "$REL_PATH")"
    mkdir -p "$TARGET_FILE_DIR"

    # Get file size before moving
    FILE_SIZE=$(stat -c%s "$FILE")
    TOTAL_SIZE=$((TOTAL_SIZE + FILE_SIZE))

    # Calculate checksum
    CHECKSUM=$(sha256sum "$FILE" | cut -d' ' -f1)

    # Move the file
    mv "$FILE" "$TARGET_FILE_DIR/"

    # Create a placeholder file with information about the moved file
    PLACEHOLDER="$FILE.asset-ref"
    echo "# This file has been moved to the external assets directory
# Original path: $FILE
# Current location: $TARGET_FILE_DIR/$(basename "$FILE")
# Size: $(numfmt --to=iec-i --suffix=B $FILE_SIZE)
# SHA256: $CHECKSUM
# Moved on: $TIMESTAMP
#
# To restore this file, use the asset manager:
# npm run assets:restore $REL_PATH
" > "$PLACEHOLDER"

    # Add entry to manifest
    ASSET_ENTRY='{
    "originalPath": "'"$REL_PATH"'",
    "storagePath": "'"$(realpath --relative-to="$TARGET_DIR" "$TARGET_FILE_DIR/$(basename "$FILE")")"'",
    "size": '"$FILE_SIZE"',
    "checksum": "'"$CHECKSUM"'",
    "movedOn": "'"$TIMESTAMP"'",
    "required": true
  }'

    # Append to the assets array
    MANIFEST_TEMP=$(echo "$MANIFEST_TEMP" | jq '. += ['"$ASSET_ENTRY"']')

    echo "Moved: $REL_PATH ($(numfmt --to=iec-i --suffix=B $FILE_SIZE))"
    MOVED_COUNT=$((MOVED_COUNT + 1))
done < "$TEMP_FILE"

# Update the manifest file with the new assets array
cat "$MANIFEST_FILE" | jq --argjson assets "$(cat "$MANIFEST_TEMP")" '.assets = $assets' > "${MANIFEST_FILE}.new"
mv "${MANIFEST_FILE}.new" "$MANIFEST_FILE"

# Clean up temporary files
rm "$TEMP_FILE" "$MANIFEST_TEMP"

echo "----------------------------------------------------------------------"
echo "Summary:"
echo "- Moved $MOVED_COUNT files"
echo "- Total size: $(numfmt --to=iec-i --suffix=B $TOTAL_SIZE)"
echo "- Assets stored in: $TARGET_DIR"
echo "- Manifest file: $MANIFEST_FILE"
echo "----------------------------------------------------------------------"
echo "To restore these files, implement the asset manager as specified in the documentation."
echo "----------------------------------------------------------------------"

# Suggest adding the target directory to .gitignore if it's not already there
if ! grep -q "^$(basename "$TARGET_DIR")/$" .gitignore; then
    echo "Consider adding the following line to your .gitignore file:"
    echo "$(basename "$TARGET_DIR")/"
fi
