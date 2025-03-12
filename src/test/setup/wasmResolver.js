/**
 * Custom resolver for Jest to handle WebAssembly modules
 * This allows us to mock WASM modules in our tests
 */

const path = require('path');

module.exports = (request, options) => {
  const { defaultResolver } = options;

  // Check if this is a WebAssembly module request
  if (request.endsWith('.wasm')) {
    // Replace WASM imports with our mock
    return defaultResolver(
      path.resolve(__dirname, '../__mocks__/wasmMock.js'),
      options
    );
  }

  // Handle WebAssembly module namespace imports
  if (request.includes('/pkg/') && request.includes('grym_physics')) {
    return defaultResolver(
      path.resolve(__dirname, '../__mocks__/wasmMock.js'),
      options
    );
  }

  // For all other requests, use the default resolver
  return defaultResolver(request, options);
};

// Helper function to check if a path points to a WASM module
const isWasmModule = (modulePath) => {
  return (
    modulePath.endsWith('.wasm') ||
    (modulePath.includes('/pkg/') && modulePath.includes('grym_physics'))
  );
};

// Export helper for use in tests if needed
module.exports.isWasmModule = isWasmModule;

// Export configuration for Jest
module.exports.createResolverConfig = (rootDir) => ({
  resolver: path.resolve(rootDir, 'src/test/setup/wasmResolver.js')
});
