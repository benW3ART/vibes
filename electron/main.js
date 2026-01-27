"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// Load .env file from project root BEFORE other imports
const envPath = path_1.default.join(__dirname, '..', '.env');
console.log('[Main] Loading .env from:', envPath);
const dotenvResult = (0, dotenv_1.config)({ path: envPath });
console.log('[Main] Dotenv result:', dotenvResult.error ? dotenvResult.error.message : 'OK');
console.log('[Main] VITE_GITHUB_CLIENT_ID:', process.env.VITE_GITHUB_CLIENT_ID ? 'SET' : 'NOT SET');
const handlers_1 = require("./ipc/handlers");
const github_1 = require("./oauth/github");
let mainWindow = null;
// Register vibes:// protocol for OAuth callbacks
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        electron_1.app.setAsDefaultProtocolClient('vibes', process.execPath, [path_1.default.resolve(process.argv[1])]);
    }
}
else {
    electron_1.app.setAsDefaultProtocolClient('vibes');
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        backgroundColor: '#050508',
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 16 },
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    (0, handlers_1.setupIpcHandlers)(mainWindow);
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        (0, handlers_1.cleanupIpc)();
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
electron_1.app.on('before-quit', () => {
    (0, handlers_1.cleanupIpc)();
});
// Handle vibes:// protocol on macOS
electron_1.app.on('open-url', (event, url) => {
    event.preventDefault();
    // Handle OAuth callbacks
    if (url.startsWith('vibes://oauth/github/callback')) {
        (0, github_1.handleGitHubCallback)(url, mainWindow);
    }
});
// Handle vibes:// protocol on Windows/Linux (single instance)
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (_event, commandLine) => {
        // Find the protocol URL in command line args
        const url = commandLine.find(arg => arg.startsWith('vibes://'));
        if (url && url.startsWith('vibes://oauth/github/callback')) {
            (0, github_1.handleGitHubCallback)(url, mainWindow);
        }
        // Focus window
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
