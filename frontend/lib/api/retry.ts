export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 2, baseDelay = 500, maxDelay = 8000, onRetry } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (controller.signal.aborted && attempt < maxRetries) {
        const delay = Math.min(baseDelay * 2 ** attempt + Math.random() * 200, maxDelay);
        onRetry?.(lastError, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (attempt >= maxRetries) break;

      const status = error && typeof error === "object" && "status" in error
        ? (error as { status: number }).status
        : null;

      if (status && status >= 400 && status < 500 && status !== 429) break;

      const delay = Math.min(baseDelay * 2 ** attempt + Math.random() * 200, maxDelay);
      onRetry?.(lastError, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Request failed");
}
