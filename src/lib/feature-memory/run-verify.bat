@echo off
echo Running Feature Memory Performance Verification...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed
    exit /b 1
)

:: Build TypeScript
echo Building TypeScript files...
call npm run build

:: Run quick verification
echo Running performance verification...
node --expose-gc core/__tests__/quick-verify.js

if %ERRORLEVEL% equ 0 (
    echo Performance verification completed successfully!
) else (
    echo Performance verification failed!
    exit /b 1
)

pause