@echo off
setlocal enabledelayedexpansion

:: Colors for output
set GREEN=[92m
set RED=[91m
set BLUE=[94m
set NC=[0m

:: Get the project root directory (3 levels up from this script)
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%..\..\..\"
set "PROJECT_ROOT=%CD%"
popd

echo %BLUE%Building TypeScript files...%NC%

:: Create dist directory if it doesn't exist
if not exist "%SCRIPT_DIR%dist" mkdir "%SCRIPT_DIR%dist"

:: Debug information
echo Current directory: %CD%
echo Project root: %PROJECT_ROOT%
echo Script directory: %SCRIPT_DIR%

:: Check if TypeScript compiler exists
if not exist "%PROJECT_ROOT%\node_modules\.bin\tsc.cmd" (
    echo %RED%TypeScript compiler not found. Checking if dependencies are installed...%NC%
    call npm install
    if errorlevel 1 (
        echo %RED%Failed to install dependencies%NC%
        exit /b 1
    )
)

:: Use locally installed TypeScript compiler from project root with test config
echo Using TypeScript compiler from: %PROJECT_ROOT%\node_modules\.bin\tsc.cmd
echo With config from: %SCRIPT_DIR%tsconfig.test.json
call "%PROJECT_ROOT%\node_modules\.bin\tsc.cmd" --project "%SCRIPT_DIR%tsconfig.test.json" --listFiles
if errorlevel 1 (
    echo %RED%TypeScript compilation failed%NC%
    echo Check the error messages above for details
    exit /b 1
)

echo %BLUE%Running audio model tests...%NC%

:: Set Jest config and test path
set JEST_CONFIG=--config "%SCRIPT_DIR%jest.config.js"
set TEST_PATH="%SCRIPT_DIR%__tests__"

:: Check if Jest exists
if not exist "%PROJECT_ROOT%\node_modules\.bin\jest.cmd" (
    echo %RED%Jest not found. Checking if dependencies are installed...%NC%
    call npm install
    if errorlevel 1 (
        echo %RED%Failed to install dependencies%NC%
        exit /b 1
    )
)

:: Run tests with coverage using local Jest installation
echo Using Jest from: %PROJECT_ROOT%\node_modules\.bin\jest.cmd
call "%PROJECT_ROOT%\node_modules\.bin\jest.cmd" %JEST_CONFIG% %TEST_PATH% --coverage --verbose
if errorlevel 1 (
    echo %RED%Some tests failed%NC%
    echo Check the error messages above for details
    exit /b 1
) else (
    echo %GREEN%All tests passed successfully!%NC%
    
    :: Display coverage summary
    echo.
    echo %BLUE%Coverage Summary:%NC%
    type coverage\lcov-report\index.html | findstr /C:"<div class='pad1'>" /C:"<div class='fraction'>"
    
    :: Open coverage report in browser
    echo.
    echo %BLUE%Opening coverage report...%NC%
    start "" coverage\lcov-report\index.html
    
    exit /b 0
)

endlocal