# Audio Learning Hub Scripts

This directory contains utility scripts for managing the project.

## Available Scripts

### cleanup.js
Manages project directories and data cleanup.

```bash
# Run directly
node scripts/cleanup.js

# Run via npm script
npm run clean
```

#### Features:
- Cleans build directories (dist, coverage)
- Cleans data directories
- Recreates necessary data directories
- Cross-platform compatible (Windows/Unix)
- Proper error handling

#### Exit Codes:
- `0`: Success
- `1`: General error
- `2`: Permission denied (try running with admin/sudo)
- `3`: Files locked by other processes

#### Environment Variables:
- `NODE_ENV=production`: Run in production mode (less verbose)
- `DEBUG=1`: Enable debug logging

## Usage in Build Process

The cleanup script is integrated into various npm scripts:

```bash
# Clean and rebuild
npm run reset

# Clean only
npm run clean

# Clean as part of build
npm run build # includes prebuild cleanup
```

## Programmatic Usage

The cleanup script can be imported and used programmatically:

```javascript
const cleanup = require('./scripts/cleanup');

async function build() {
  try {
    await cleanup();
    // Continue with build process
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}
```

## Error Handling

The script handles various error conditions:
- Permission issues
- Locked files
- Missing directories
- Invalid paths

When using the script programmatically, errors are thrown with appropriate error codes that can be caught and handled by the calling code.

## Platform-Specific Notes

### Windows
- Uses appropriate path separators
- Handles Windows-specific permissions
- Uses Windows-compatible symbols for output

### Unix/Linux
- Handles symbolic links correctly
- Respects file permissions
- Uses UTF-8 symbols for output when supported