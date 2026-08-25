const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, shell, dialog, screen } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// ── Configuration ──
const APP_NAME = "MyWorkspace";
const APP_VERSION = app.getVersion();
let APP_URL = process.env.APP_URL || "https://app.myworkspace.com";
const UPDATE_FEEDBACK_INTERVAL = 1000 * 60 * 60; // 1 hour

let mainWindow = null;
let tray = null;
let isQuitting = false;

// ── Logger Setup ──
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
log.info(`Starting ${APP_NAME} v${APP_VERSION}`);

// ── Workspace Data Path ──
const DEFAULT_DATA_PATH = path.join(app.getPath("documents"), "MyWorkspaceData");
let workspaceDataPath = DEFAULT_DATA_PATH;

function loadConfig() {
  try {
    const configPath = path.join(app.getPath("userData"), "workspace-config.json");
    if (fs.existsSync(configPath)) {
      const config = fs.readJsonSync(configPath);
      if (config.workspaceDataPath && fs.existsSync(config.workspaceDataPath)) {
        workspaceDataPath = config.workspaceDataPath;
      }
      if (config.appUrl) {
        APP_URL = config.appUrl;
      }
    }
  } catch (err) {
    log.error("Failed to load config:", err);
  }
}

function saveConfig() {
  try {
    const configPath = path.join(app.getPath("userData"), "workspace-config.json");
    fs.writeJsonSync(configPath, {
      workspaceDataPath,
      appUrl: APP_URL,
      version: APP_VERSION,
      lastLaunch: new Date().toISOString(),
    });
  } catch (err) {
    log.error("Failed to save config:", err);
  }
}

function ensureDataDirectories() {
  const dirs = [
    path.join(workspaceDataPath, "database"),
    path.join(workspaceDataPath, "cache"),
    path.join(workspaceDataPath, "uploads"),
    path.join(workspaceDataPath, "downloads"),
    path.join(workspaceDataPath, "backups"),
    path.join(workspaceDataPath, "logs"),
    path.join(workspaceDataPath, "temp"),
    path.join(workspaceDataPath, "config"),
  ];
  dirs.forEach((dir) => fs.ensureDirSync(dir));
  log.info(`Workspace data directories ensured at: ${workspaceDataPath}`);
}

// ── Error Page HTML ──
function getErrorPageHTML(url, error) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${APP_NAME} - Connection Error</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: #e2e8f0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 500px;
          text-align: center;
          background: rgba(30, 41, 59, 0.8);
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.1);
        }
        .icon {
          width: 80px;
          height: 80px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 36px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 16px;
          color: #f8fafc;
        }
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin: 16px 0;
          font-size: 14px;
          color: #fca5a5;
        }
        .url {
          word-break: break-all;
          color: #94a3b8;
          font-size: 13px;
          margin: 8px 0;
        }
        .help {
          margin-top: 24px;
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.6;
        }
        .help strong {
          color: #e2e8f0;
        }
        .actions {
          margin-top: 24px;
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        button {
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        .btn-primary:hover {
          background: #2563eb;
        }
        .btn-secondary {
          background: rgba(148, 163, 184, 0.1);
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }
        .btn-secondary:hover {
          background: rgba(148, 163, 184, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚠</div>
        <h1>Unable to Connect</h1>
        <p>The application could not load the login page.</p>
        <div class="error-message">
          <strong>Error:</strong> ${error || 'Server unreachable'}
        </div>
        <p class="url">URL: ${url}</p>
        <div class="help">
          <p><strong>Possible causes:</strong></p>
          <p>• The server is not running</p>
          <p>• The URL is incorrect</p>
          <p>• Network connection issue</p>
        </div>
        <div class="actions">
          <button class="btn-primary" onclick="location.reload()">Try Again</button>
          <button class="btn-secondary" onclick="window.electronAPI?.openSettings()">Settings</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── Main Window ──
function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1400, width),
    height: Math.min(900, height),
    minWidth: 1024,
    minHeight: 700,
    title: APP_NAME,
    icon: path.join(__dirname, "assets", "icon.png"),
    show: false,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      spellcheck: true,
    },
  });

  mainWindow.loadURL(APP_URL);

  // Handle load failures
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    log.error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    const errorHTML = getErrorPageHTML(validatedURL, errorDescription);
    mainWindow.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (process.env.NODE_ENV === "development") {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// ── Tray Icon ──
function createTray() {
  const trayIconPath = path.join(__dirname, "assets", "tray-icon.png");
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip(APP_NAME);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Open ${APP_NAME}`,
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      },
    },
    { type: "separator" },
    {
      label: "Check for Updates",
      click: () => {
        autoUpdater.checkForUpdates();
      },
    },
    { type: "separator" },
    {
      label: "About MyWorkspace",
      click: () => {
        dialog.showMessageBox({
          type: "info",
          title: `About ${APP_NAME}`,
          message: `${APP_NAME} v${APP_VERSION}`,
          detail: "All-in-one workspace management platform.\n© MyWorkspace. All rights reserved.",
        });
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── Auto Updater ──
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    log.info(`Update available: ${info.version}`);
    if (mainWindow) {
      mainWindow.webContents.send("update-available", info);
    }
    new Notification({
      title: APP_NAME,
      body: `Version ${info.version} is available. Downloading...`,
      icon: path.join(__dirname, "assets", "icon.png"),
    }).show();
  });

  autoUpdater.on("update-not-available", () => {
    log.info("No updates available.");
  });

  autoUpdater.on("download-progress", (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send("update-progress", progress);
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info(`Update downloaded: ${info.version}`);
    if (mainWindow) {
      mainWindow.webContents.send("update-downloaded", info);
    }
    new Notification({
      title: APP_NAME,
      body: `Version ${info.version} downloaded. Restart to install.`,
      icon: path.join(__dirname, "assets", "icon.png"),
    }).show();
  });

  autoUpdater.on("error", (err) => {
    log.error("Update error:", err);
  });
}

// ── IPC Handlers ──
function setupIPC() {
  ipcMain.handle("get-app-info", () => ({
    name: APP_NAME,
    version: APP_VERSION,
    workspaceDataPath,
    dataPath: app.getPath("userData"),
    platform: process.platform,
    arch: process.arch,
  }));

  ipcMain.handle("get-workspace-data-path", () => workspaceDataPath);

  ipcMain.handle("set-workspace-data-path", (_event, newPath) => {
    if (newPath && typeof newPath === "string") {
      workspaceDataPath = newPath;
      ensureDataDirectories();
      saveConfig();
      return { success: true, path: workspaceDataPath };
    }
    return { success: false, error: "Invalid path" };
  });

  ipcMain.handle("get-config", () => {
    loadConfig();
    return {
      workspaceDataPath,
      version: APP_VERSION,
    };
  });

  ipcMain.handle("select-directory", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory", "createDirectory"],
      title: "Select Workspace Data Folder",
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return { selected: true, path: result.filePaths[0] };
    }
    return { selected: false };
  });

  ipcMain.handle("open-external", (_event, url) => {
    if (typeof url === "string") {
      shell.openExternal(url);
    }
  });

  ipcMain.handle("show-save-dialog", async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle("check-for-updates", () => {
    autoUpdater.checkForUpdates();
  });

  ipcMain.handle("install-update", () => {
    autoUpdater.quitAndInstall();
  });

  // System notifications from renderer
  ipcMain.on("show-notification", (_event, { title, body }) => {
    new Notification({ title, body }).show();
  });

  // Open settings dialog
  ipcMain.handle("open-settings", async () => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Change URL", "Cancel"],
      title: "Application Settings",
      message: "Server URL Configuration",
      detail: `Current URL: ${APP_URL}\n\nWould you like to change the server URL?`,
    });

    if (result.response === 0) {
      // Show input dialog for URL
      const urlResult = await dialog.showMessageBox(mainWindow, {
        type: "question",
        buttons: ["http://localhost:3000", "https://app.myworkspace.com", "Cancel"],
        title: "Select Server URL",
        message: "Choose the server URL to connect to:",
        detail: "Select an option or click Cancel to keep the current URL.",
      });

      let newUrl = APP_URL;
      if (urlResult.response === 0) {
        newUrl = "http://localhost:3000";
      } else if (urlResult.response === 1) {
        newUrl = "https://app.myworkspace.com";
      } else {
        return { success: false, error: "Cancelled" };
      }

      if (newUrl !== APP_URL) {
        APP_URL = newUrl;
        saveConfig();
        mainWindow.loadURL(APP_URL);
        return { success: true, url: newUrl };
      }
    }
    return { success: false, error: "Cancelled" };
  });
}

// ── First Launch Configuration ──
async function showFirstLaunchDialog() {
  const configPath = path.join(app.getPath("userData"), "workspace-config.json");
  const isFirstLaunch = !fs.existsSync(configPath);

  if (!isFirstLaunch) {
    return;
  }

  const result = await dialog.showMessageBox(null, {
    type: "question",
    buttons: ["Local Development (localhost:3000)", "Production Server (app.myworkspace.com)", "Skip for now"],
    title: `Welcome to ${APP_NAME}`,
    message: `Welcome to ${APP_NAME}!`,
    detail: "This appears to be your first time running the application.\n\nPlease select which server to connect to:",
    defaultId: 0,
    cancelId: 2,
  });

  if (result.response === 0) {
    APP_URL = "http://localhost:3000";
  } else if (result.response === 1) {
    APP_URL = "https://app.myworkspace.com";
  }
  // result.response === 2 means Skip, keep default APP_URL
}

// ── App Lifecycle ──
app.whenReady().then(async () => {
  loadConfig();
  ensureDataDirectories();
  await showFirstLaunchDialog();
  saveConfig();
  setupIPC();
  createMainWindow();
  createTray();
  setupAutoUpdater();

  // Check for updates after a delay
  setTimeout(() => {
    if (process.env.NODE_ENV !== "development") {
      autoUpdater.checkForUpdates();
    }
  }, 10000);

  // Periodic update check
  setInterval(() => {
    if (process.env.NODE_ENV !== "development") {
      autoUpdater.checkForUpdates();
    }
  }, UPDATE_FEEDBACK_INTERVAL);

  app.on("activate", () => {
    if (mainWindow === null) {
      createMainWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Don't quit - keep running in tray
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("will-quit", () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
