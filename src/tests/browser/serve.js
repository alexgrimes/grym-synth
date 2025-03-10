const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        // Serve the test page
        fs.readFile(path.join(__dirname, 'minimal-test.html'), (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end(`Error loading test page: ${err.message}`);
                return;
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        });
        return;
    }

    // Handle audio file uploads for testing
    if (req.method === 'POST' && req.url === '/process-audio') {
        let data = [];
        req.on('data', chunk => {
            data.push(chunk);
        });
        req.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Audio processed successfully'
            }));
        });
        return;
    }

    // 404 for all other routes
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  Audio Learning System - Basic Tests   ║
╠═══════════════════════════════════════╣
║                                       ║
║  Server running at:                   ║
║  http://localhost:${PORT}               ║
║                                       ║
║  Press Ctrl+C to stop                 ║
║                                       ║
╚═══════════════════════════════════════╝
`);
});

// Handle server shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server stopped');
        process.exit();
    });
});