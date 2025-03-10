console.log('Basic Memory Check');
console.log('=================\n');

const stats = process.memoryUsage();
console.log('Memory Usage:');
console.log(`  Heap Used: ${Math.round(stats.heapUsed / 1024 / 1024)}MB`);
console.log(`  Heap Total: ${Math.round(stats.heapTotal / 1024 / 1024)}MB`);
console.log(`  RSS: ${Math.round(stats.rss / 1024 / 1024)}MB`);

// Exit explicitly
process.exit(0);