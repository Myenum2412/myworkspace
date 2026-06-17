import { Response, NextFunction } from "express";
import type { AuthRequest } from "../types";
export type { AuthRequest };
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void;
