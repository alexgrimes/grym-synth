@echo off
echo Running Memory Management Tests
echo ==============================

REM Set memory limits and enable garbage collection
set NODE_OPTIONS=--max-old-space-size=256 --expose-gc

REM Run basic tests first
echo.
echo Running Basic Memory Tests...
call npx jest basic-memory-manager.test.ts --runInBand --verbose --no-cache

REM Clean up between test runs
node -e "global.gc && setTimeout(() => process.exit(0), 100)"

REM Display final memory status
echo.
echo Memory Status:
node -e "const m = process.memoryUsage(); console.log('  Heap Used:  ' + Math.round(m.heapUsed/1024/1024) + 'MB\n  Heap Total: ' + Math.round(m.heapTotal/1024/1024) + 'MB\n  RSS:        ' + Math.round(m.rss/1024/1024) + 'MB')"

echo.
echo Tests Complete
pause