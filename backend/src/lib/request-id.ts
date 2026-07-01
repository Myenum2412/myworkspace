import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const existing = req.headers["x-request-id"] || req.headers["x-correlation-id"];
  const id = Array.isArray(existing) ? existing[0] : existing || crypto.randomUUID();
  req.headers["x-request-id"] = id as string;
  _res.setHeader("x-request-id", id as string);
  next();
}
