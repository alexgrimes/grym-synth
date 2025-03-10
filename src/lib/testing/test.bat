@echo off
setlocal EnableDelayedExpansion

:: Color codes
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set NC=[0m

:: Helper functions
:print_header
echo.
echo %YELLOW%=== %~1 ===%NC%
echo.
goto :eof

:run_command
echo %YELLOW%Running:%NC% %~1
call %~1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo %GREEN%Success!%NC%
    echo.
) else (
    echo.
    echo %RED%Failed!%NC%
    echo.
)
goto :eof

:show_help
echo Test Runner for Error Handling Tests
echo.
echo Usage: test.bat [command]
echo.
echo Commands:
echo   all       Run all tests
echo   watch     Run tests in watch mode
echo   coverage  Run tests with coverage
echo   verify    Run verification tests
echo   quick     Quick test run
echo   help      Show this help message
echo.
goto :eof

:: Main script
if "%1"=="" goto help
if "%1"=="help" goto help

if "%1"=="all" (
    call :print_header "Running All Tests"
    call :run_command "npm run test:error"
    goto end
)

if "%1"=="watch" (
    call :print_header "Running Tests in Watch Mode"
    call :run_command "npm run test:error:watch"
    goto end
)

if "%1"=="coverage" (
    call :print_header "Running Tests with Coverage"
    call :run_command "npm run test:error -- --coverage"
    goto end
)

if "%1"=="verify" (
    call :print_header "Running Verification Tests"
    call :run_command "npm run test:error -- --testMatch '**/verification.test.ts'"
    goto end
)

if "%1"=="quick" (
    call :print_header "Running Quick Tests"
    call :run_command "npm run test:error -- --onlyChanged"
    goto end
)

echo %RED%Unknown command: %1%NC%
echo Use 'test.bat help' for usage information
goto end

:help
call :show_help
goto end

:end
if exist "coverage\lcov-report\index.html" (
    call :print_header "Coverage Summary"
    echo View detailed coverage report:
    echo coverage\lcov-report\index.html
)

endlocal
exit /b 0