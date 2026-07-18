const inFlightRequests = new Map<string, Promise<unknown>>();

export function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

export function cancelRequest(key: string): void {
  inFlightRequests.delete(key);
}

export function clearPendingRequests(): void {
  inFlightRequests.clear();
}
