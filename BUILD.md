# Building Unblunder Desktop Executable

This guide explains how to build a one-click desktop executable for Windows.

## Prerequisites

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **Python** (3.8 or higher) - [Download](https://www.python.org/downloads/)
3. **npm** (comes with Node.js)

## Quick Start

### Option 1: Simple Batch Script (Easiest)

For a quick solution, you can create a simple batch script that starts both servers:

1. Create a file `Unblunder.bat` in the project root:

```batch
@echo off
echo Starting Unblunder...
start "Django Server" cmd /k "cd backend && python manage.py runserver"
timeout /t 3 /nobreak >nul
start "Unblunder App" "http://localhost:5173"
cd frontend
npm run dev
```

2. You can convert this `.bat` file to an `.exe` using tools like:
   - [Bat To Exe Converter](https://www.battoexeconverter.com/)
   - [IExpress](https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/iexpress) (built into Windows)

### Option 2: Electron Desktop App (Recommended)

This creates a professional desktop application with a single executable.

#### Step 1: Install Dependencies

```bash
# Install root-level dependencies (Electron)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

#### Step 2: Build the Frontend

```bash
cd frontend
npm run build
cd ..
```

#### Step 3: Build the Electron App

```bash
npm run electron:build
```

This will create an installer in the `dist-electron` folder.

#### Step 4: Install and Run

1. Run the installer from `dist-electron`
2. The app will be installed and a desktop shortcut will be created
3. Double-click the shortcut to launch the app

## Development Mode

To run the app in development mode (with hot-reload):

```bash
# Terminal 1: Start Django backend
cd backend
python manage.py runserver

# Terminal 2: Start frontend dev server
cd frontend
npm run dev

# Terminal 3: Start Electron
npm run electron:dev
```

## Important Notes

### Python Dependency

The current Electron setup assumes Python is installed on the system. For a truly standalone executable, you have two options:

1. **Bundle Python with the app** (larger file size, ~100MB+)
2. **Use PyInstaller** to create a standalone backend executable, then have Electron launch it

### PyInstaller Option (Standalone Backend)

To create a standalone backend executable:

1. Install PyInstaller:
```bash
pip install pyinstaller
```

2. Create a backend launcher script `backend/launcher.py`:
```python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import execute_from_command_line
execute_from_command_line(['manage.py', 'runserver', '127.0.0.1:8000'])
```

3. Build with PyInstaller:
```bash
cd backend
pyinstaller --onefile --name unblunder-backend launcher.py
```

4. Update `electron/main.js` to use the PyInstaller executable instead of Python.

### Stockfish Executable

The Stockfish executable (`stockfish-windows-x86-64-avx2.exe`) is automatically included in the Electron build. Make sure it's in the project root.

## Troubleshooting

### "Python not found" error
- Make sure Python is installed and in your PATH
- Try running `python --version` in a terminal to verify

### Backend won't start
- Check that all Django dependencies are installed: `pip install -r backend/requirements.txt`
- Run migrations: `cd backend && python manage.py migrate`

### Frontend build errors
- Make sure all frontend dependencies are installed: `cd frontend && npm install`
- Check for TypeScript errors: `cd frontend && npm run lint`

## File Structure After Build

```
dist-electron/
  ├── Unblunder Setup 1.0.0.exe  (Installer)
  └── win-unpacked/              (Unpacked app for testing)
      ├── Unblunder.exe
      └── resources/
          ├── backend/
          ├── stockfish-windows-x86-64-avx2.exe
          └── app.asar (frontend bundle)
```

