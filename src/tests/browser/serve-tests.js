const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const chalk = require('chalk');

const app = express();
const port = process.env.PORT || 3001;

// Compile TypeScript files
function compileTypeScript() {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue('Compiling TypeScript files...'));
    
    exec('tsc -p tsconfig.test.json', { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(chalk.red('TypeScript compilation failed:'));
        console.error(chalk.red(stderr));
        reject(error);
        return;
      }
      console.log(chalk.green('TypeScript compilation successful'));
      resolve();
    });
  });
}

// Serve static files from the dist directory
app.use('/dist', express.static(path.join(process.cwd(), 'dist')));

// Serve the test runner HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'runner.html'));
});

// Start the server
async function startServer() {
  try {
    await compileTypeScript();
    
    app.listen(port, () => {
      console.log(chalk.green(`
╔════════════════════════════════════════════╗
║   Audio Learning System Browser Tests       ║
╠════════════════════════════════════════════╣
║                                            ║
║   Server running at:                       ║
║   http://localhost:${port}                   ║
║                                            ║
║   Press Ctrl+C to stop                     ║
║                                            ║
╚════════════════════════════════════════════╝
`));
    });

  } catch (error) {
    console.error(chalk.red('Failed to start test server:'));
    console.error(error);
    process.exit(1);
  }
}

// Handle server shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nShutting down server...'));
  process.exit();
});

// Start everything up
startServer();