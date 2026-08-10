const CHUNK_ERROR_PATTERNS = [
  /Failed to load chunk/i,
  /Loading chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Failed to load module/i,
  /Loading CSS chunk/i,
  /Failed to load css chunk/i,
];

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}
