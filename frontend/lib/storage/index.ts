import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");

function ensureDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function saveFile(buffer: Buffer, fileName: string): string {
  ensureDir();
  const storagePath = `${Date.now()}-${fileName}`;
  const fullPath = path.join(UPLOADS_DIR, storagePath);
  fs.writeFileSync(fullPath, buffer);
  return storagePath;
}

export function getFilePath(storagePath: string): string {
  return path.join(UPLOADS_DIR, storagePath);
}

export function deleteFile(storagePath: string): void {
  const fullPath = path.join(UPLOADS_DIR, storagePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export function fileExists(storagePath: string): boolean {
  return fs.existsSync(path.join(UPLOADS_DIR, storagePath));
}
