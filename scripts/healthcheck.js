#!/usr/bin/env node
/**
 * Health Check Script for Audio Learning Hub
 *
 * This script performs a comprehensive health check of the application
 * and its dependencies. It can be used as a standalone script or as
 * a Docker HEALTHCHECK command.
 *
 * Exit codes:
 * - 0: All checks passed
 * - 1: One or more checks failed
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  // Health check endpoint
  endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',

  // Host and port
  host: process.env.HEALTH_CHECK_HOST || 'localhost',
  port: parseInt(process.env.PORT || '3000', 10),

  // Protocol (http or https)
  protocol: process.env.HEALTH_CHECK_PROTOCOL || 'http',

  // Timeout in milliseconds
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),

  // Whether to check disk space
  checkDiskSpace: process.env.HEALTH_CHECK_DISK_SPACE !== 'false',

  // Minimum required disk space in MB
  minDiskSpace: parseInt(process.env.HEALTH_CHECK_MIN_DISK_SPACE || '100', 10),

  // Whether to check memory usage
  checkMemory: process.env.HEALTH_CHECK_MEMORY !== 'false',

  // Maximum allowed memory usage in percentage
  maxMemoryUsage: parseInt(process.env.HEALTH_CHECK_MAX_MEMORY_USAGE || '90', 10),

  // Whether to check CPU usage
  checkCpu: process.env.HEALTH_CHECK_CPU !== 'false',

  // Maximum allowed CPU usage in percentage
  maxCpuUsage: parseInt(process.env.HEALTH_CHECK_MAX_CPU_USAGE || '90', 10),

  // Whether to check for required files
  checkFiles: process.env.HEALTH_CHECK_FILES !== 'false',

  // Required files to check for existence
  requiredFiles: (process.env.HEALTH_CHECK_REQUIRED_FILES || 'dist/index.js').split(','),

  // Verbose output
  verbose: process.env.HEALTH_CHECK_VERBOSE === 'true'
};

// Logger
const log = {
  info: (message) => {
    if (config.verbose) {
      console.log(`[INFO] ${message}`);
    }
  },
  error: (message) => {
    console.error(`[ERROR] ${message}`);
  },
  success: (message) => {
    if (config.verbose) {
      console.log(`[SUCCESS] ${message}`);
    }
  }
};

// Health check results
const results = {
  api: null,
  disk: null,
  memory: null,
  cpu: null,
  files: null
};

// Check API health
function checkApiHealth() {
  return new Promise((resolve, reject) => {
    log.info(`Checking API health at ${config.protocol}://${config.host}:${config.port}${config.endpoint}`);

    const requestOptions = {
      hostname: config.host,
      port: config.port,
      path: config.endpoint,
      method: 'GET',
      timeout: config.timeout,
      headers: {
        'User-Agent': 'HealthCheck/1.0'
      }
    };

    const client = config.protocol === 'https' ? https : http;

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(data);
            log.success('API health check passed');
            resolve({ status: 'ok', data: response });
          } catch (err) {
            log.error(`Failed to parse API response: ${err.message}`);
            reject(new Error(`Invalid API response: ${err.message}`));
          }
        } else {
          log.error(`API returned status code ${res.statusCode}`);
          reject(new Error(`API health check failed with status code ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      log.error(`API request failed: ${err.message}`);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      log.error(`API request timed out after ${config.timeout}ms`);
      reject(new Error(`API request timed out after ${config.timeout}ms`));
    });

    req.end();
  });
}

// Check disk space
function checkDiskSpace() {
  if (!config.checkDiskSpace) {
    log.info('Disk space check disabled');
    return Promise.resolve({ status: 'skipped' });
  }

  return new Promise((resolve, reject) => {
    log.info('Checking disk space');

    try {
      // This is a simplified check that works on most systems
      // For a more accurate check, consider using a library like 'diskusage'
      const df = execSync('df -k .').toString();
      const lines = df.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('Unexpected df output format');
      }

      const stats = lines[1].split(/\s+/);
      if (stats.length < 5) {
        throw new Error('Unexpected df output format');
      }

      // Get available space in MB
      const availableMB = parseInt(stats[3], 10) / 1024;

      if (availableMB >= config.minDiskSpace) {
        log.success(`Disk space check passed (${availableMB.toFixed(2)} MB available)`);
        resolve({ status: 'ok', available: availableMB });
      } else {
        log.error(`Disk space check failed: ${availableMB.toFixed(2)} MB available, minimum required is ${config.minDiskSpace} MB`);
        reject(new Error(`Insufficient disk space: ${availableMB.toFixed(2)} MB available, minimum required is ${config.minDiskSpace} MB`));
      }
    } catch (err) {
      log.error(`Disk space check failed: ${err.message}`);
      reject(err);
    }
  });
}

// Check memory usage
function checkMemoryUsage() {
  if (!config.checkMemory) {
    log.info('Memory usage check disabled');
    return Promise.resolve({ status: 'skipped' });
  }

  return new Promise((resolve, reject) => {
    log.info('Checking memory usage');

    try {
      const memInfo = process.memoryUsage();
      const usedMB = memInfo.rss / (1024 * 1024);
      const totalMB = os.totalmem() / (1024 * 1024);
      const usagePercent = (usedMB / totalMB) * 100;

      if (usagePercent <= config.maxMemoryUsage) {
        log.success(`Memory usage check passed (${usagePercent.toFixed(2)}%)`);
        resolve({ status: 'ok', usage: usagePercent });
      } else {
        log.error(`Memory usage check failed: ${usagePercent.toFixed(2)}%, maximum allowed is ${config.maxMemoryUsage}%`);
        reject(new Error(`Excessive memory usage: ${usagePercent.toFixed(2)}%, maximum allowed is ${config.maxMemoryUsage}%`));
      }
    } catch (err) {
      log.error(`Memory usage check failed: ${err.message}`);
      reject(err);
    }
  });
}

// Check required files
function checkRequiredFiles() {
  if (!config.checkFiles) {
    log.info('File check disabled');
    return Promise.resolve({ status: 'skipped' });
  }

  return new Promise((resolve, reject) => {
    log.info('Checking required files');

    try {
      const missingFiles = [];

      for (const file of config.requiredFiles) {
        const filePath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
          missingFiles.push(file);
        }
      }

      if (missingFiles.length === 0) {
        log.success('All required files exist');
        resolve({ status: 'ok' });
      } else {
        log.error(`Missing required files: ${missingFiles.join(', ')}`);
        reject(new Error(`Missing required files: ${missingFiles.join(', ')}`));
      }
    } catch (err) {
      log.error(`File check failed: ${err.message}`);
      reject(err);
    }
  });
}

// Run all health checks
async function runHealthChecks() {
  let hasErrors = false;

  try {
    results.api = await checkApiHealth();
  } catch (err) {
    results.api = { status: 'error', error: err.message };
    hasErrors = true;
  }

  try {
    results.disk = await checkDiskSpace();
  } catch (err) {
    results.disk = { status: 'error', error: err.message };
    hasErrors = true;
  }

  try {
    results.memory = await checkMemoryUsage();
  } catch (err) {
    results.memory = { status: 'error', error: err.message };
    hasErrors = true;
  }

  try {
    results.files = await checkRequiredFiles();
  } catch (err) {
    results.files = { status: 'error', error: err.message };
    hasErrors = true;
  }

  // Print summary
  if (config.verbose) {
    console.log('\nHealth Check Summary:');
    console.log(JSON.stringify(results, null, 2));
  }

  if (hasErrors) {
    console.error('\nHealth check failed!');
    process.exit(1);
  } else {
    console.log('\nAll health checks passed!');
    process.exit(0);
  }
}

// Run the health checks
runHealthChecks().catch((err) => {
  console.error(`Unhandled error: ${err.message}`);
  process.exit(1);
});
