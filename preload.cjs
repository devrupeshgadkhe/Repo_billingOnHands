/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Electron Preload Script for Billing On Hand
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates"),
  restartAndInstall: () => ipcRenderer.invoke("app:restart-and-install"),
  
  onUpdateStatus: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("updater:status", listener);
    return () => ipcRenderer.removeListener("updater:status", listener);
  },
  
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url)
});
