#!/usr/bin/env node

const { join } = require('path');
const { rimraf } = require('rimraf');
const { mkdir } = require('fs/promises');
const { platform } = require('os');

const DIRECTORIES_TO_CLEAN = [
  'dist',
  'coverage',
  join('data', 'examples', 'vectors')
];

const isWindows = platform() === 'win32';

async function cleanup() {
  const rootDir = join(__dirname, '..');
  const tick = isWindows ? '√' : '✓';
  const cross = isWindows ? 'x' : '✗';
  
  console.log('Cleaning project directories...\n');
  
  for (const dir of DIRECTORIES_TO_CLEAN) {
    const fullPath = join(rootDir, dir);
    try {
      await rimraf(fullPath);
      console.log(`${tick} Cleaned ${dir}`);
    } catch (error) {
      console.error(`${cross} Error cleaning ${dir}:`, error.message);
      if (!error.message.includes('ENOENT')) {
        throw error; // Re-throw if it's not a "file not found" error
      }
    }
  }

  console.log('\nRecreating required directories...');
  
  try {
    // Recreate data directories with normalized path
    const dataDir = join(rootDir, 'data', 'examples', 'vectors');
    await mkdir(dataDir, { recursive: true });
    console.log(`${tick} Recreated data directories`);
  } catch (error) {
    console.error(`${cross} Error recreating directories:`, error.message);
    throw error;
  }

  console.log('\nCleanup complete!');
}

// Add proper error handling for different environments
if (require.main === module) {
  cleanup().catch(error => {
    console.error('\nFatal error during cleanup:', error);
    
    // Set exit code based on error type
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      console.error('Permission denied. Try running with administrator privileges.');
      process.exit(2);
    } else if (error.code === 'EBUSY') {
      console.error('Some files are locked. Close any applications using the directories.');
      process.exit(3);
    } else {
      process.exit(1);
    }
  });
}

// Export for programmatic usage
module.exports = cleanup;