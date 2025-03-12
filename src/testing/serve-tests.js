/**
 * GrymSynth Browser Tests Server
 *
 * A simple HTTP server to serve the browser compatibility tests.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css'
};

const server = http.createServer((req, res) => {
    // Default to browser-test-runner.html
    let filePath = path.join(__dirname, req.url === '/' ? 'browser-test-runner.html' : req.url);

    // Get the file extension
    const ext = path.extname(filePath);

    // Set the content type
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'text/plain');

    // Read and serve the file
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end(`File ${filePath} not found!`);
            return;
        }

        res.writeHead(200);
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`
GrymSynth Browser Compatibility Test Server

Server running at http://localhost:${PORT}
Open this URL in your browser to run the tests.

Available routes:
- http://localhost:${PORT}/ - Test Runner UI
- http://localhost:${PORT}/browser-compatibility.js - Browser Compatibility Tests
- http://localhost:${PORT}/framework.js - Test Framework

Press Ctrl+C to stop the server.
`);
});

// Handle server shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server stopped.');
        process.exit(0);
    });
});
