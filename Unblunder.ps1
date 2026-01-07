# Unblunder - Chess Blunder Analyzer Launcher
# PowerShell version

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Unblunder - Starting Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python from https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[1/3] Starting Django backend server..." -ForegroundColor Yellow
$backendScript = "cd '$PSScriptRoot\backend'; python manage.py runserver 127.0.0.1:8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript -WindowStyle Minimized

Start-Sleep -Seconds 3

Write-Host "[2/3] Checking frontend dependencies..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "[3/3] Starting frontend development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Application is starting..." -ForegroundColor Cyan
Write-Host "  Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The app will open in your browser automatically." -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers." -ForegroundColor Yellow
Write-Host ""

# Open browser after a short delay
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

# Start the frontend dev server (this will block)
npm run dev

