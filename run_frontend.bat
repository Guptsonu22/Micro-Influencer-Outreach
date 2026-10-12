@echo off
echo =======================================================
echo Starting EDXSO AI Influencer Outreach - Frontend Dashboard
echo =======================================================
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo [INFO] Installing npm dependencies...
    call npm install
)
echo [INFO] Starting Vite development server on http://localhost:5173...
call npm run dev
pause
