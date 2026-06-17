import { JwtPayload } from "../types";
export declare function signToken(payload: JwtPayload): string;
export declare function verifyToken(token: string): JwtPayload;
