/**
 * Asset Downloader for grym-synth
 *
 * This script downloads required models and assets from external storage.
 * Run this script after cloning the repository to set up all required files.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration for assets
const config = {
  models: [
    {
      name: 'GAMA',
      url: 'https://example.com/models/gama-latest.pt',
      path: 'models/gama/model.pt',
      required: true
    },
    {
      name: 'AudioLDM',
      url: 'https://example.com/models/audioldm-s-full.pt',
      path: 'models/audioldm/audioldm-s-full.pt',
      required: true
    }
  ],
  testData: [
    {
      name: 'Sample Audio',
      url: 'https://example.com/data/samples.zip',
      path: 'data/audio/samples.zip',
      extract: true,
      required: false
    }
  ]
};

// Create directories
function createDirectories() {
  console.log('Creating directories...');

  const directories = [
    'models/gama',
    'models/audioldm',
    'data/audio'
  ];

  directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(\Created directory: \docs\);
    }
  });
}

// Download a file
async function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const destPath = path.join(__dirname, '..', destination);
    const file = fs.createWriteStream(destPath);

    console.log(\Downloading \ to \...\);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(\Failed to download \: \\));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(\Downloaded \\);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// Extract zip file
function extractZip(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  const extractDir = path.dirname(fullPath);

  console.log(\Extracting \...\);

  try {
    // Use PowerShell's Expand-Archive for Windows
    execSync(\powershell -command "Expand-Archive -Path '\' -DestinationPath '\' -Force"\);
    console.log(\Extracted \\);
  } catch (error) {
    console.error(\Failed to extract \: \\);
    throw error;
  }
}

// Main function
async function main() {
  try {
    createDirectories();

    // Download models
    console.log('Downloading models...');
    for (const model of config.models) {
      try {
        await downloadFile(model.url, model.path);
      } catch (error) {
        if (model.required) {
          console.error(\Failed to download required model \: \\);
          process.exit(1);
        } else {
          console.warn(\Warning: Failed to download optional model \: \\);
        }
      }
    }

    // Download test data
    console.log('Downloading test data...');
    for (const data of config.testData) {
      try {
        await downloadFile(data.url, data.path);
        if (data.extract) {
          extractZip(data.path);
        }
      } catch (error) {
        if (data.required) {
          console.error(\Failed to download required test data \: \\);
          process.exit(1);
        } else {
          console.warn(\Warning: Failed to download optional test data \: \\);
        }
      }
    }

    console.log('✅ All assets downloaded successfully!');
  } catch (error) {
    console.error(\❌ Error: \\);
    process.exit(1);
  }
}

main();
