@echo off
echo =======================================================
echo Starting EDXSO AI Influencer Outreach - Backend Server
echo =======================================================
cd /d "%~dp0backend"
if not exist "venv\Scripts\activate.bat" (
    echo [INFO] Creating Python virtual environment in backend\venv...
    python -m venv venv
)
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat
echo [INFO] Installing / verifying dependencies...
pip install -r requirements.txt
echo [INFO] Starting FastAPI server on http://127.0.0.1:8000...
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
pause
