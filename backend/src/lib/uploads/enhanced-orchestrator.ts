/**
 * Enhanced upload orchestrator — provides upload coordination and MIME
 * categorisation for file processing pipelines.
 */

import { categoriseMime } from "../upload-security.js";

export { categoriseMime as categorizeMime };

export type UploadCategory = "image" | "document" | "archive" | "video" | "audio" | "general";

/**
 * Orchestrate an upload: determine category and validate basic constraints.
 * Returns the category and whether the upload should proceed.
 */
export function orchestrateUpload(mimeType: string, size: number, maxSize: number): {
  category: UploadCategory;
  allowed: boolean;
  reason?: string;
} {
  if (size > maxSize) {
    return { category: "general", allowed: false, reason: "File exceeds maximum size" };
  }

  const category = categoriseMime(mimeType) as UploadCategory;

  return { category, allowed: true };
}
