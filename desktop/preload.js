const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // App info
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),
  getConfig: () => ipcRenderer.invoke("get-config"),
  openSettings: () => ipcRenderer.invoke("open-settings"),

  // Workspace data path
  getWorkspaceDataPath: () => ipcRenderer.invoke("get-workspace-data-path"),
  setWorkspaceDataPath: (newPath) => ipcRenderer.invoke("set-workspace-data-path", newPath),
  selectDirectory: () => ipcRenderer.invoke("select-directory"),

  // External links
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateAvailable: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on("update-available", handler);
    return () => ipcRenderer.removeListener("update-available", handler);
  },
  onUpdateProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on("update-progress", handler);
    return () => ipcRenderer.removeListener("update-progress", handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on("update-downloaded", handler);
    return () => ipcRenderer.removeListener("update-downloaded", handler);
  },

  // Notifications
  showNotification: (title, body) => ipcRenderer.send("show-notification", { title, body }),

  // Platform detection
  isElectron: true,
  platform: process.platform,
});
