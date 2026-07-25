// Minimal preload for the Electron desktop window.
// Exposes a small, safe API to the renderer without enabling nodeIntegration.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('appShell', {
  platform: process.platform,
  version: process.env.npm_package_version || '0.0.0',
});
