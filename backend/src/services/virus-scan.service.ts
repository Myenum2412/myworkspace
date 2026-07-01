import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { logger } from "../lib/logger/index.js";

const execFileAsync = promisify(execFile);

let clamAvAvailable: boolean | null = null;

async function checkClamAvAvailability(): Promise<boolean> {
  if (clamAvAvailable !== null) return clamAvAvailable;
  try {
    await execFileAsync("clamdscan", ["--version"], { timeout: 3000 });
    clamAvAvailable = true;
    logger.info("ClamAV virus scanner detected");
  } catch {
    clamAvAvailable = false;
    logger.warn("ClamAV not available, virus scanning disabled");
  }
  return clamAvAvailable;
}

export interface ScanResult {
  status: "clean" | "infected" | "error";
  details: string;
  scannedAt: Date;
}

export async function scanFile(filePath: string): Promise<ScanResult> {
  const available = await checkClamAvAvailability();
  if (!available) {
    return { status: "clean", details: "Virus scanning not available - file passed through unchecked", scannedAt: new Date() };
  }

  try {
    const { stdout, stderr } = await execFileAsync("clamdscan", ["--no-summary", filePath], { timeout: 30000 });
    if (stderr && !stdout) {
      return { status: "error", details: stderr.trim(), scannedAt: new Date() };
    }
    if (stdout.includes("OK")) {
      return { status: "clean", details: "File passed virus scan", scannedAt: new Date() };
    }
    if (stdout.includes("FOUND")) {
      const virusName = stdout.replace(filePath, "").replace(":","").trim();
      return { status: "infected", details: virusName || "Unknown malware detected", scannedAt: new Date() };
    }
    return { status: "clean", details: "No threats detected", scannedAt: new Date() };
  } catch (err: any) {
    logger.error({ err, filePath }, "Virus scan execution failed");
    return { status: "error", details: err.message || "Scan failed", scannedAt: new Date() };
  }
}

export async function scanBuffer(buffer: Buffer): Promise<ScanResult> {
  const tmpPath = path.join("/tmp", `virus-scan-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    await fs.promises.writeFile(tmpPath, buffer);
    return await scanFile(tmpPath);
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}
