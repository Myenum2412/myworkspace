import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ success: false, error: "Authentication required" });
        return;
    }
    const token = header.slice(7);
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
}
export function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
        const token = header.slice(7);
        try {
            req.user = jwt.verify(token, env.JWT_SECRET);
        }
        catch {
            // Token invalid, proceed without user
        }
    }
    next();
}
