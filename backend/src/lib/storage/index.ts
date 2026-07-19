export { getStorageProvider, LocalStorageProvider, R2StorageProvider, computeChecksum, isLocalProvider, getStorageType } from "./providers.js";
export { getR2Client, getR2Config, isR2Configured, getSignedUrl, GetObjectCommand, PutObjectCommand } from "./r2-client.js";

import { getStorageProvider } from "./providers.js";

export async function saveFile(buffer: Buffer, storagePath: string): Promise<void> {
  const provider = getStorageProvider();
  await provider.save(buffer, storagePath);
}

export async function getFileBuffer(storagePath: string): Promise<Buffer | null> {
  const provider = getStorageProvider();
  return provider.get(storagePath);
}

export async function deleteFile(storagePath: string): Promise<void> {
  const provider = getStorageProvider();
  await provider.delete(storagePath);
}
