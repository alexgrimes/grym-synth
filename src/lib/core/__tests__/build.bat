@echo off
echo Building TypeScript files...

REM Compile TypeScript files
call tsc ^
  ..\memory-status.ts ^
  ..\basic-memory-manager.ts ^
  .\memory-helper.ts ^
  .\check-memory.ts ^
  --module commonjs ^
  --target ES2018 ^
  --outDir ./dist

echo Build complete.