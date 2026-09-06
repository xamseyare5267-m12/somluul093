/**
 * SomLuul Desktop — Windows x64 Electron main process
 * Native 64-bit desktop window for the SomLuul web platform.
 */
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
const LOCAL_PORT = process.env.PORT || 3847;
const APP_TITLE = 'SomLuul';

function getDistIndex() {
  const candidates = [
    path.join(__dirname, 'dist', 'index.html'),
    path.join(process.resourcesPath || '', 'app', 'dist', 'index.html'),
    path.join(process.resourcesPath || '', 'dist', 'index.html'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

function getServerEntry() {
  const candidates = [
    path.join(__dirname, 'dist', 'server.cjs'),
    path.join(process.resourcesPath || '', 'app', 'dist', 'server.cjs'),
    path.join(process.resourcesPath || '', 'dist', 'server.cjs'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

function waitForServer(url, attempts = 40) {
  return new Promise((resolve, reject) => {
    let left = attempts;
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        left -= 1;
        if (left <= 0) reject(new Error('Server did not start'));
        else setTimeout(tryOnce, 250);
      });
    };
    tryOnce();
  });
}

function startLocalServer() {
  const serverEntry = getServerEntry();
  if (!serverEntry) return Promise.resolve(null);

  return new Promise((resolve) => {
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(LOCAL_PORT),
      ELECTRON_RUN: '1',
    };
    // On Windows, Electron's process.execPath is the .exe — use system node if available
    const nodeBin = process.env.ELECTRON_RUN_AS_NODE ? process.execPath : 'node';
    try {
      serverProcess = spawn(nodeBin, [serverEntry], {
        env,
        cwd: path.dirname(serverEntry),
        stdio: 'ignore',
        windowsHide: true,
        shell: process.platform === 'win32',
      });
      serverProcess.on('error', () => resolve(null));
    } catch (_) {
      return resolve(null);
    }
    waitForServer('http://127.0.0.1:' + LOCAL_PORT + '/')
      .then(() => resolve('http://127.0.0.1:' + LOCAL_PORT))
      .catch(() => resolve(null));
  });
}

async function createWindow() {
  const iconPath = path.join(__dirname, 'public', 'favicon.ico');
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 400,
    minHeight: 640,
    title: APP_TITLE,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
    },
    autoHideMenuBar: true,
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  let loadUrl = process.env.APP_URL || null;

  if (!loadUrl) {
    const local = await startLocalServer();
    if (local) loadUrl = local;
  }

  if (!loadUrl) {
    const indexHtml = getDistIndex();
    if (indexHtml) {
      await mainWindow.loadFile(indexHtml);
      mainWindow.on('closed', () => {
        mainWindow = null;
      });
      return;
    }
  }

  if (!loadUrl) {
    // Packaged desktop: open the live website (same account as mobile/web)
    loadUrl = process.env.SOMLUUL_APP_URL || 'https://somluul-00021.vercel.app';
  }

  try {
    await mainWindow.loadURL(loadUrl);
  } catch (err) {
    dialog.showErrorBox(
      'SomLuul',
      'Could not open the app window. Check your internet connection or reinstall.'
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function cleanup() {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill();
    } catch (_) {}
    serverProcess = null;
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    cleanup();
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', cleanup);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
