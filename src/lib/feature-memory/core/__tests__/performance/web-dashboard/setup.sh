#!/bin/bash

# Install required dependencies
npm install express ws @types/express @types/ws
npm install --save-dev typescript ts-node @types/node

# Create TypeScript configuration
cat > tsconfig.json << EOL
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node", "express", "ws"]
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "**/*.spec.ts",
    "dist"
  ]
}
EOL

# Add start script to package.json
if [ -f package.json ]; then
  # Use jq if available, otherwise use sed
  if command -v jq &> /dev/null; then
    jq '.scripts.dashboard = "ts-node core/__tests__/performance/web-dashboard/dashboard.ts"' package.json > package.json.tmp && mv package.json.tmp package.json
  else
    sed -i 's/"scripts": {/"scripts": {\n    "dashboard": "ts-node core\/__tests__\/performance\/web-dashboard\/dashboard.ts",/' package.json
  fi
fi

# Create directories for static files
mkdir -p public/css public/js

# Install development dependencies for frontend
npm install --save-dev chart.js socket.io-client