/**
 * Script to update API endpoints and references in the codebase
 * This ensures that any hardcoded references to the old repository name are updated
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to search for
const patterns = [
  { search: /grym-synth/g, replace: 'grym-synth' },
  { search: /grym-synth/g, replace: 'GRYM_SYNTH' },
  { search: /grym-synth/g, replace: 'grym-synth' }
];

// Find all relevant files
glob('src/**/*.{ts,tsx,js,jsx,json,md}', { ignore: 'node_modules/**' }, (err, files) => {
  if (err) {
    console.error('Error finding files:', err);
    process.exit(1);
  }

  let updatedFiles = 0;

  files.forEach(file => {
    const filePath = path.resolve(file);
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    patterns.forEach(pattern => {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(\Updated references in: \README.md\);
      updatedFiles++;
    }
  });

  console.log(\\nCompleted! Updated \ files.\);
});

