import { config } from 'dotenv';
import { app, BrowserWindow } from 'electron';
import path from 'path';

// Load .env file from project root BEFORE other imports
const envPath = path.join(__dirname, '..', '.env');
console.log('[Main] Loading .env from:', envPath);
const dotenvResult = config({ path: envPath });
console.log('[Main] Dotenv result:', dotenvResult.error ? dotenvResult.error.message : 'OK');
console.log('[Main] VITE_GITHUB_CLIENT_ID:', process.env.VITE_GITHUB_CLIENT_ID ? 'SET' : 'NOT SET');

import { setupIpcHandlers, cleanupIpc } from './ipc/handlers';
import { handleGitHubCallback } from './oauth/github';

let mainWindow: BrowserWindow | null = null;

// Register vibes:// protocol for OAuth callbacks
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('vibes', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('vibes');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#050508',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  setupIpcHandlers(mainWindow);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    cleanupIpc();
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  cleanupIpc();
});

// Handle vibes:// protocol on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();

  // Handle OAuth callbacks
  if (url.startsWith('vibes://oauth/github/callback')) {
    handleGitHubCallback(url, mainWindow);
  }
});

// Handle vibes:// protocol on Windows/Linux (single instance)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Find the protocol URL in command line args
    const url = commandLine.find(arg => arg.startsWith('vibes://'));
    if (url && url.startsWith('vibes://oauth/github/callback')) {
      handleGitHubCallback(url, mainWindow);
    }

    // Focus window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
