import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../config/env.js";
import { downloadLimiter, publicInfoLimiter } from "../middleware/rate-limit.js";

const router = Router();

const INSTALLER_VERSION = "1.0.0";
const PUBLISHER = "MyWorkspace";
const PRODUCT_NAME = "MyWorkspace";

// Path where built installers are stored (relative to project root)
const INSTALLER_DIR = path.resolve(process.cwd(), "data", "installers");

function getLatestInstallerPath(): string | null {
  try {
    if (!fs.existsSync(INSTALLER_DIR)) return null;
    const files = fs.readdirSync(INSTALLER_DIR)
      .filter((f) => f.endsWith(".exe") && f.startsWith("MyWorkspaceSetup"))
      .sort()
      .reverse();
    return files.length > 0 ? path.join(INSTALLER_DIR, files[0]) : null;
  } catch {
    return null;
  }
}

function getInstallerSize(): number {
  const installerPath = getLatestInstallerPath();
  if (installerPath) {
    try {
      return fs.statSync(installerPath).size;
    } catch {
      return 0;
    }
  }
  return 0;
}

// ── GET /api/installer/info ──
// Returns metadata about the latest available installer
router.get("/info", publicInfoLimiter, (_req: Request, res: Response) => {
  const installerPath = getLatestInstallerPath();
  const installerSize = getInstallerSize();
  const installerExists = installerPath !== null;

  res.json({
    success: true,
    data: {
      name: PRODUCT_NAME,
      version: INSTALLER_VERSION,
      publisher: PUBLISHER,
      downloadUrl: "/api/installer/download",
      filename: installerExists ? path.basename(installerPath) : "MyWorkspaceSetup.exe",
      size: installerSize,
      sizeFormatted: installerSize > 0
        ? installerSize > 1073741824
          ? `${(installerSize / 1073741824).toFixed(2)} GB`
          : installerSize > 1048576
            ? `${(installerSize / 1048576).toFixed(1)} MB`
            : `${(installerSize / 1024).toFixed(0)} KB`
        : "Unknown",
      checksum: installerExists ? getFileChecksum(installerPath) : null,
      architecture: "x64",
      platform: "win32",
      minOSVersion: "Windows 10 1809+",
      releaseDate: installerExists
        ? fs.statSync(installerPath).mtime.toISOString()
        : new Date().toISOString(),
      changelog: `# MyWorkspace v${INSTALLER_VERSION}\n\n## What's New\n- Native Windows desktop application\n- Offline workspace management\n- Background synchronization\n- System tray integration\n- Automatic updates\n- Enhanced security`,
      requirements: {
        os: "Windows 10 (64-bit) or later",
        ram: "4 GB minimum (8 GB recommended)",
        storage: "500 MB for application + 10 GB for workspace data",
        processor: "Intel/AMD x64, 2 GHz or faster",
        dependencies: ["Microsoft VC++ Redistributable (included)"],
      },
      features: [
        "Offline workspace management with Auto-sync",
        "Background file synchronization",
        "System tray with notification support",
        "Automatic background updates",
        "Native OS notifications and alerts",
        "Secure local data encryption at rest",
        "Customizable workspace data location",
        "Desktop and Start Menu shortcuts",
        "File type associations (.mws, .mwst)",
        "myworkspace:// protocol handler",
      ],
    },
  });
});

// ── GET /api/installer/download ──
// Downloads the latest installer executable
router.get("/download", downloadLimiter, (req: Request, res: Response) => {
  const installerPath = getLatestInstallerPath();

  if (!installerPath) {
    // If no installer is built yet, return a helpful response
    res.status(404).json({
      success: false,
      error: "Installer not available",
      message: "The Windows desktop installer is not yet built. Please build it from the desktop/ directory.",
      details: {
        howToBuild: "Run 'npm run build:win' in the desktop/ directory to generate the installer.",
        docs: "https://app.myworkspace.com/docs/desktop/setup",
      },
    });
    return;
  }

  const filename = path.basename(installerPath);
  const fileSize = fs.statSync(installerPath).size;

  res.setHeader("Content-Type", "application/vnd.microsoft.portable-executable");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", fileSize);
  res.setHeader("X-Installer-Version", INSTALLER_VERSION);
  res.setHeader("X-Installer-Name", PRODUCT_NAME);

  const readStream = fs.createReadStream(installerPath);
  readStream.pipe(res);

  readStream.on("error", (err) => {
    console.error("Installer download error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to stream installer",
      });
    }
  });
});

// ── GET /api/installer/updates ──
// electron-updater compatible update feed
router.get("/updates", publicInfoLimiter, (_req: Request, res: Response) => {
  const installerPath = getLatestInstallerPath();
  const installerSize = getInstallerSize();

  const updateData = {
    version: INSTALLER_VERSION,
    files: [
      {
        url: installerPath ? `/api/installer/download` : "",
        size: installerSize,
        sha512: installerPath ? getFileChecksum(installerPath) : "",
      },
    ],
    path: installerPath ? `/api/installer/download` : "",
    sha512: installerPath ? getFileChecksum(installerPath) : "",
    releaseDate: installerPath
      ? fs.statSync(installerPath).mtime.toISOString()
      : new Date().toISOString(),
    releaseNotes: `# MyWorkspace v${INSTALLER_VERSION}\n\nNative Windows desktop application with offline support.`,
  };

  res.json(updateData);
});

// ── GET /api/installer/checksum ──
// Returns SHA-512 checksum of the installer for verification
router.get("/checksum", publicInfoLimiter, (_req: Request, res: Response) => {
  const installerPath = getLatestInstallerPath();

  if (!installerPath) {
    res.status(404).json({
      success: false,
      error: "No installer available",
    });
    return;
  }

  res.json({
    success: true,
    data: {
      filename: path.basename(installerPath),
      algorithm: "sha512",
      hash: getFileChecksum(installerPath),
      size: getInstallerSize(),
    },
  });
});

function getFileChecksum(filePath: string): string {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha512");
    hash.update(fileBuffer);
    return hash.digest("hex");
  } catch {
    return "";
  }
}

export default router;
