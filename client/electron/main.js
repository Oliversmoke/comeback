// Electron desktop wrapper for StakeMind.
//
// Launches the unified server (Next.js pages + API + Socket.IO) as a child
// Node process, waits for it to accept connections, then opens a window to it.
// This makes the whole app — frontend and backend — a single desktop app.
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
// In production the app is packaged; load the hosted/unified URL. In dev,
// spawn the local unified server so everything runs from one process.
const LOAD_URL = process.env.ELECTRON_URL || `http://127.0.0.1:${PORT}`;

let backend = null;

function startBackend() {
  if (process.env.ELECTRON_URL) return; // use remotely hosted unified server
  const serverPath = path.join(__dirname, '..', 'unified-server.mjs');
  backend = spawn('node', [serverPath], {
    env: {
      ...process.env,
      UNIFIED_SERVER: 'true',
      PORT: String(PORT),
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
    stdio: 'inherit',
  });
  backend.on('error', (e) => console.error('Backend failed to start:', e.message));
}

function waitForPort(port, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const tryConnect = () => {
      const sock = net.connect(port, '127.0.0.1');
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() > deadline) return reject(new Error('Backend did not start in time'));
        setTimeout(tryConnect, 500);
      });
    };
    tryConnect();
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.removeMenu();
  await waitForPort(PORT);
  await win.loadURL(LOAD_URL);
}

function shutdown() {
  if (backend) backend.kill();
  backend = null;
}

app.whenReady().then(async () => {
  startBackend();
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  shutdown();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', shutdown);
