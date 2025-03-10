@echo off
setlocal EnableDelayedExpansion

:: Colors for output
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set NC=[0m

:: Print header
echo.
echo %YELLOW%Running Test Infrastructure Tests%NC%
echo.

:: Get directory of this script
set SCRIPT_DIR=%~dp0

:: Set Jest config path
set JEST_CONFIG=%SCRIPT_DIR%jest.config.js

:: Check if watch mode is requested
set WATCH_MODE=
if "%1"=="--watch" set WATCH_MODE=--watch

:: Print config info
echo %YELLOW%Using config:%NC% %JEST_CONFIG%
echo.

:: Run tests
npx jest --config "%JEST_CONFIG%" %WATCH_MODE%

:: Check result
if %ERRORLEVEL% EQU 0 (
    echo.
    echo %GREEN%All test infrastructure tests passed!%NC%
    echo.
    
    :: Show coverage if available
    if exist "coverage\test-infrastructure\lcov-report\index.html" (
        echo %YELLOW%Coverage report available at:%NC%
        echo coverage\test-infrastructure\lcov-report\index.html
    )
    
    exit /b 0
) else (
    echo.
    echo %RED%Test infrastructure tests failed!%NC%
    echo.
    
    :: Show error report if available
    if exist "coverage\test-infrastructure\junit.xml" (
        echo %YELLOW%Detailed error report available at:%NC%
        echo coverage\test-infrastructure\junit.xml
    )
    
    exit /b 1
)

endlocal