@echo off
echo Starting Memory Monitor...
echo Press Ctrl+C to stop

REM Run with reasonable memory limits and GC enabled
node --expose-gc --max-old-space-size=256 -r ts-node/register monitor-memory.ts

echo Monitor stopped.