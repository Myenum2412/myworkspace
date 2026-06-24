import { Request, Response, NextFunction } from "express";

const isMongooseError = (err: Error & { name?: string; errors?: Record<string, { message: string; path: string }> }): boolean =>
  err.name === "ValidationError" && !!err.errors;

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const LOG_DEPRECATED = true;

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const method = req.method;
  const url = req.originalUrl || req.url;

  // Mongoose validation errors
  if (isMongooseError(err as any)) {
    const mongooseErr = err as any;
    const fields: Record<string, string> = {};
    for (const [key, val] of Object.entries(mongooseErr.errors)) {
      fields[key] = (val as any).message;
    }
    console.warn(`[400] ${method} ${url} — Validation error:`, Object.keys(fields).join(", "));
    res.status(400).json({
      success: false,
      error: "Validation failed",
      fields,
    });
    return;
  }

  // MongoDB duplicate key error
  if ((err as any).code === 11000) {
    const keyValue = (err as any).keyValue || {};
    const key = Object.keys(keyValue)[0] || "field";
    console.warn(`[409] ${method} ${url} — Duplicate key: ${key}`);
    res.status(409).json({
      success: false,
      error: `A record with this ${key} already exists`,
      fields: { [key]: `Already exists` },
    });
    return;
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;

  if (statusCode === 404) {
    console.warn(`[404] ${method} ${url} — Route not found. Check if the route is registered.`);
  } else if (statusCode >= 500) {
    console.error(`[${statusCode}] ${method} ${url} — Server error:`, err.message);
  } else {
    console.warn(`[${statusCode}] ${method} ${url} — ${err.message}`);
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      fields: err.fields || undefined,
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
}
