@echo off
REM Run memory check with ts-node and exposed GC
call npx ts-node --transpile-only --compilerOptions {"module":"commonjs"} -r ts-node/register --expose-gc check-memory.ts

REM Pause to see results
pause