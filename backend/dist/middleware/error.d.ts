import { Request, Response, NextFunction } from "express";
export declare class AppError extends Error {
    statusCode: number;
    fields?: Record<string, string> | undefined;
    constructor(statusCode: number, message: string, fields?: Record<string, string> | undefined);
}
export declare function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void;
