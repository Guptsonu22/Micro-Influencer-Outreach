# PowerShell full-stack launch script
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Launching EDXSO AI Influencer Outreach - Full Stack System" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

Write-Host "`n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; if (!(Test-Path 'venv\Scripts\Activate.ps1')) { python -m venv venv }; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt; uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting React Frontend Dashboard on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; if (!(Test-Path 'node_modules')) { npm install }; npm run dev"

Write-Host "`nBoth services are running in dedicated PowerShell terminal windows!" -ForegroundColor Yellow
Write-Host "Backend API:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "Frontend UI:  http://localhost:5173`n" -ForegroundColor White
