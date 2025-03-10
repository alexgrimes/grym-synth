#!/bin/bash

# identify-large-files.sh
# Script to identify files larger than a specified size in the repository
# Usage: ./identify-large-files.sh [size_in_mb] [directory]

set -e

# Default values
SIZE_THRESHOLD=${1:-10}  # Default to 10MB if not specified
DIRECTORY=${2:-.}        # Default to current directory if not specified
SIZE_IN_BYTES=$((SIZE_THRESHOLD * 1024 * 1024))

echo "Searching for files larger than ${SIZE_THRESHOLD}MB in ${DIRECTORY}..."
echo "----------------------------------------------------------------------"

# Find files larger than the threshold and sort by size (largest first)
find "$DIRECTORY" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -size +${SIZE_THRESHOLD}M -exec ls -lh {} \; | sort -rh -k 5 | awk '{print $5 " " $9}'

echo "----------------------------------------------------------------------"
echo "Summary of file types exceeding ${SIZE_THRESHOLD}MB:"
echo "----------------------------------------------------------------------"

# Find files and extract extensions for summary
find "$DIRECTORY" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -size +${SIZE_THRESHOLD}M | grep -o '\.[^./]*$' | sort | uniq -c | sort -rn

echo "----------------------------------------------------------------------"
echo "Directories containing large files:"
echo "----------------------------------------------------------------------"

# Find directories containing large files and count them
find "$DIRECTORY" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -size +${SIZE_THRESHOLD}M | xargs -I{} dirname {} | sort | uniq -c | sort -rn

echo "----------------------------------------------------------------------"
echo "Recommendation for .gitignore:"
echo "----------------------------------------------------------------------"

# Generate recommended .gitignore entries
find "$DIRECTORY" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -size +${SIZE_THRESHOLD}M | xargs -I{} dirname {} | sort | uniq | sed 's/^\.\///'

echo "----------------------------------------------------------------------"
echo "To add these directories to .gitignore, run:"
echo "find \"\$DIRECTORY\" -type f -not -path \"*/node_modules/*\" -not -path \"*/.git/*\" -size +${SIZE_THRESHOLD}M | xargs -I{} dirname {} | sort | uniq | sed 's/^\\.\///' >> .gitignore"
echo "----------------------------------------------------------------------"
