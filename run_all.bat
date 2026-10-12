@echo off
echo ==============================================================
echo Launching EDXSO AI Influencer Outreach - Full Stack System
echo ==============================================================
echo.
echo Launching FastAPI Backend in a new terminal...
start "EDXSO Backend (Port 8000)" cmd /k "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
echo Launching React Frontend Dashboard in a new terminal...
start "EDXSO Frontend (Port 5173)" cmd /k "%~dp0run_frontend.bat"
echo.
echo ==============================================================
echo Backend running at:  http://127.0.0.1:8000
echo Interactive Docs:    http://127.0.0.1:8000/docs
echo Frontend running at: http://localhost:5173
echo ==============================================================
