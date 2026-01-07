const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let djangoProcess;
let isDevelopment = process.env.NODE_ENV === 'development';

// Paths
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const backendPath = isDev 
  ? path.join(__dirname, '..', 'backend')
  : path.join(process.resourcesPath, 'backend');
const stockfishPath = isDev
  ? path.join(__dirname, '..', 'stockfish-windows-x86-64-avx2.exe')
  : path.join(process.resourcesPath, 'stockfish-windows-x86-64-avx2.exe');

// For now, we'll use system Python. In production, you can bundle Python with the app
// or use PyInstaller to create a standalone backend executable
function findPythonExecutable() {
  // Try common Python paths
  const pythonCommands = ['python', 'python3', 'py'];
  
  for (const cmd of pythonCommands) {
    try {
      const { execSync } = require('child_process');
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch (e) {
      // Command not found, try next
    }
  }
  
  return 'python'; // Fallback
}

function startDjangoServer() {
  console.log('Starting Django server...');
  console.log('Backend path:', backendPath);
  
  const pythonCmd = findPythonExecutable();
  console.log('Using Python:', pythonCmd);
  
  startDjangoWithPython(pythonCmd);
}

function startDjangoWithPython(pythonCmd) {
  const managePyPath = path.join(backendPath, 'manage.py');
  
  // Set environment variables
  const env = {
    ...process.env,
    DJANGO_SETTINGS_MODULE: 'config.settings',
    PYTHONUNBUFFERED: '1',
  };

  // Start Django server
  djangoProcess = spawn(pythonCmd, ['manage.py', 'runserver', '127.0.0.1:8000'], {
    cwd: backendPath,
    env: env,
    shell: true,
  });

  djangoProcess.stdout.on('data', (data) => {
    console.log(`Django: ${data}`);
  });

  djangoProcess.stderr.on('data', (data) => {
    console.error(`Django Error: ${data}`);
  });

  djangoProcess.on('close', (code) => {
    console.log(`Django process exited with code ${code}`);
    if (code !== 0 && code !== null) {
      console.error('Django server exited unexpectedly');
    }
  });

  djangoProcess.on('error', (err) => {
    console.error('Failed to start Django server:', err);
    if (mainWindow) {
      mainWindow.webContents.send('backend-error', err.message);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'), // Optional: add an icon
  });

  // Wait a bit for Django to start, then load the app
  setTimeout(() => {
    if (isDev) {
      // In development, load from Vite dev server
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      // In production, load from built files
      mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
    }
  }, 2000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startDjangoServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (djangoProcess) {
    djangoProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (djangoProcess) {
    djangoProcess.kill();
  }
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

