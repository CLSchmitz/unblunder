@echo off
title Unblunder - Chess Blunder Analyzer
echo ========================================
echo   Unblunder - Starting Application
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Starting Django backend server...
start "Unblunder Backend" /min cmd /k "cd /d %~dp0backend && python manage.py runserver 127.0.0.1:8000"
timeout /t 3 /nobreak >nul

echo [2/3] Building frontend (first time only)...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

echo [3/3] Starting frontend development server...
echo.
echo ========================================
echo   Application is starting...
echo   Backend: http://localhost:8000
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo The app will open in your browser automatically.
echo.
echo Press Ctrl+C to stop all servers.
echo.

REM Open browser after a short delay
timeout /t 5 /nobreak >nul
start http://localhost:5173

REM Start the frontend dev server (this will block)
call npm run dev

REM Cleanup: Kill Django server when frontend closes
taskkill /FI "WINDOWTITLE eq Unblunder Backend*" /T /F >nul 2>&1

