import { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/index.js";
export type { AuthRequest };
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void>;
