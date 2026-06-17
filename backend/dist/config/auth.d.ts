import { JwtPayload } from "../types/index.js";
export declare function signToken(payload: JwtPayload): string;
export declare function verifyToken(token: string): JwtPayload;
