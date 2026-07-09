const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, shell, dialog, screen } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// ── Configuration ──
const APP_NAME = "MyWorkspace";
const APP_VERSION = app.getVersion();
const APP_URL = process.env.APP_URL || "https://app.myworkspace.com";
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
}

// ── App Lifecycle ──
app.whenReady().then(() => {
  loadConfig();
  ensureDataDirectories();
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
