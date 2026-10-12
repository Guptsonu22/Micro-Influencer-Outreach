# PowerShell full-stack launch script
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Launching EDXSO AI Influencer Outreach - Full Stack System" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# Determine Python 3.14 path to avoid MSYS2 conflict
$pyPath = "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe"
if (!(Test-Path $pyPath)) {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $pyCmd = "py -3.14"
    } else {
        $pyCmd = "python"
    }
} else {
    $pyCmd = "& `"$pyPath`""
}

Write-Host "`n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; `$env:PYTHONPATH='$root'; Write-Host 'Starting FastAPI server...'; $pyCmd -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting React Frontend Dashboard on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; if (!(Test-Path 'node_modules')) { npm install }; npm run dev"

Write-Host "`nBoth services launched in separate windows!" -ForegroundColor Yellow
Write-Host "Backend API:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "Frontend UI:  http://localhost:5173`n" -ForegroundColor White
