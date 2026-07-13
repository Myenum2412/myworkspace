import { Request, Response, NextFunction } from "express";

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Request timeout middleware.
 * Aborts the response if the handler takes too long.
 */
export function requestTimeout(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: "Request timeout",
        });
      }
    }, timeoutMs);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));

    next();
  };
}
