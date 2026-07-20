import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { AsyncLocalStorage } from "async_hooks";

export interface CorrelationContext {
  requestId: string;
  correlationId: string;
  spanId: string;
  startTime: number;
}

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export const asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (
    Array.isArray(req.headers["x-request-id"])
      ? req.headers["x-request-id"][0]
      : req.headers["x-request-id"] || crypto.randomUUID()
  ) as string;
  const correlationId = (
    Array.isArray(req.headers["x-correlation-id"])
      ? req.headers["x-correlation-id"][0]
      : req.headers["x-correlation-id"] || requestId
  ) as string;

  const context: CorrelationContext = {
    requestId,
    correlationId,
    spanId: requestId.slice(0, 16),
    startTime: Date.now(),
  };

  req.headers["x-request-id"] = requestId;
  req.headers["x-correlation-id"] = correlationId;
  res.setHeader("x-request-id", requestId);
  res.setHeader("x-correlation-id", correlationId);

  asyncLocalStorage.run(context, () => next());
}

export function getCorrelationContext(): CorrelationContext | undefined {
  return asyncLocalStorage.getStore();
}

export function getCorrelationLogContext(): Record<string, unknown> {
  const ctx = getCorrelationContext();
  return ctx
    ? { requestId: ctx.requestId, correlationId: ctx.correlationId, spanId: ctx.spanId }
    : {};
}
