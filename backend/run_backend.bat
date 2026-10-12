@echo off
setlocal enabledelayedexpansion
echo =======================================================
echo Starting EDXSO AI Influencer Outreach - Backend Server
echo =======================================================
:: Change directory to project root (parent folder of backend)
cd /d "%~dp0.."

:: Set PYTHONPATH so backend imports work seamlessly
set "PYTHONPATH=%cd%;%PYTHONPATH%"

:: Detect Python executable (preferring Windows Python 3.14 where packages are installed)
set "PYTHON_EXE="

if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
) else (
    where py >nul 2>nul
    if not errorlevel 1 (
        set "PYTHON_EXE=py -3.14"
    ) else (
        where python >nul 2>nul
        if not errorlevel 1 (
            set "PYTHON_EXE=python"
        )
    )
)

if "%PYTHON_EXE%"=="" (
    echo [ERROR] Python not found. Please install Python 3.10+ from python.org.
    pause
    exit /b 1
)

echo [INFO] Selected Python interpreter: %PYTHON_EXE%
echo [INFO] Starting FastAPI server on http://127.0.0.1:8000...
echo [INFO] Interactive Swagger docs available at http://127.0.0.1:8000/docs
echo.

%PYTHON_EXE% -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
if errorlevel 1 (
    echo [ERROR] Server failed to start.
    pause
)
