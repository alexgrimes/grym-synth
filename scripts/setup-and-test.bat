@echo off
setlocal enabledelayedexpansion

echo Setting up test environment...

:: Create Python virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Install Python dependencies
echo Installing Python dependencies...
pip install -r scripts\requirements.txt

:: Install Node dependencies
echo Installing Node.js dependencies...
call npm install

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Run tests in sequence
echo Running test suites...

:: 1. Unit Tests
echo Running unit tests...
call npm run test tests/services/Wav2Vec2Service.test.ts --silent
if errorlevel 1 (
    echo Unit tests failed
    exit /b 1
)

:: 2. Integration Tests
echo Running integration tests...
call npm run test tests/integration/Wav2Vec2Integration.test.ts --silent
if errorlevel 1 (
    echo Integration tests failed
    exit /b 1
)

:: 3. Performance Tests
echo Running performance tests...
set RUN_PERFORMANCE_TESTS=true
call npm run test tests/performance/Wav2Vec2Performance.test.ts --silent
if errorlevel 1 (
    echo Performance tests failed
    exit /b 1
)

:: Test Summary
echo Test Summary:
echo =============

:: Check logs for warnings and errors
echo Checking logs for warnings and errors...
if exist "logs\wav2vec2.log" (
    :: Count warnings and errors
    set /a warn_count=0
    set /a error_count=0
    for /f "tokens=*" %%a in ('findstr /c:"WARN" logs\wav2vec2.log') do set /a warn_count+=1
    for /f "tokens=*" %%a in ('findstr /c:"ERROR" logs\wav2vec2.log') do set /a error_count+=1
    
    echo Warning count: !warn_count!
    echo Error count: !error_count!
    
    echo Recent Warnings:
    findstr /c:"WARN" logs\wav2vec2.log
    
    echo Recent Errors:
    findstr /c:"ERROR" logs\wav2vec2.log
    
    echo Memory Usage Summary:
    findstr /c:"memory" logs\wav2vec2.log
)

echo Test run complete.

:: Deactivate virtual environment
deactivate
endlocal