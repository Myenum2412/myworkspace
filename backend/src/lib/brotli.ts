import { Request, Response, NextFunction } from "express";
import { createBrotliCompress, constants } from "zlib";

const BROTLI_QUALITY = 4;

function acceptsBrotli(req: Request): boolean {
  const accept = req.headers["accept-encoding"];
  return !!accept && accept.includes("br");
}

export function brotliCompress(req: Request, res: Response, next: NextFunction): void {
  if (!acceptsBrotli(req)) {
    next();
    return;
  }

  const originalEnd = res.end.bind(res);
  const originalWrite = res.write.bind(res);
  const chunks: Buffer[] = [];

  res.write = function (chunk: any, ...args: any[]): boolean {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return true;
  } as any;

  res.end = function (chunk?: any, ...args: any[]): void {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

    const body = Buffer.concat(chunks);
    if (body.length < 1024) {
      originalWrite(body);
      originalEnd();
      return;
    }

    res.removeHeader("Content-Length");
    res.setHeader("Content-Encoding", "br");

    createBrotliCompress({
      params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY },
    }).on("data", (compressed) => originalWrite(compressed))
      .on("end", () => originalEnd())
      .end(body);
  } as any;

  next();
}
