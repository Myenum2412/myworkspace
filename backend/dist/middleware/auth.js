import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
function tryNextAuthCookie(req) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader)
        return null;
    const cookies = cookieHeader.split(";").map(c => c.trim());
    for (const cookie of cookies) {
        const [name, ...rest] = cookie.split("=");
        if (name === "authjs.session-token" || name === "__Secure-authjs.session-token") {
            const token = rest.join("=");
            try {
                const decoded = jwt.verify(token, env.JWT_SECRET);
                return {
                    userId: decoded.sub || decoded.id || decoded.userId,
                    email: decoded.email || "",
                    role: decoded.role || "member",
                };
            }
            catch {
                return null;
            }
        }
    }
    return null;
}
export function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
        const token = header.slice(7);
        try {
            const decoded = jwt.verify(token, env.JWT_SECRET);
            req.user = decoded;
            next();
            return;
        }
        catch {
            res.status(401).json({ success: false, error: "Invalid or expired token" });
            return;
        }
    }
    const nextAuthUser = tryNextAuthCookie(req);
    if (nextAuthUser) {
        req.user = nextAuthUser;
        next();
        return;
    }
    res.status(401).json({ success: false, error: "Authentication required" });
}
export function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
        const token = header.slice(7);
        try {
            req.user = jwt.verify(token, env.JWT_SECRET);
            next();
            return;
        }
        catch {
            // Token invalid, proceed without user
        }
    }
    const nextAuthUser = tryNextAuthCookie(req);
    if (nextAuthUser) {
        req.user = nextAuthUser;
    }
    next();
}
