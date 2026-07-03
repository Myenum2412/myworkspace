const isMongooseError = (err) => err.name === "ValidationError" && !!err.errors;
export class AppError extends Error {
    statusCode;
    fields;
    constructor(statusCode, message, fields) {
        super(message);
        this.statusCode = statusCode;
        this.fields = fields;
        this.name = "AppError";
    }
}
const LOG_DEPRECATED = true;
export function errorHandler(err, req, res, _next) {
    const method = req.method;
    const url = req.originalUrl || req.url;
    // Mongoose validation errors
    if (isMongooseError(err)) {
        const mongooseErr = err;
        const fields = {};
        for (const [key, val] of Object.entries(mongooseErr.errors)) {
            fields[key] = val.message;
        }
        console.warn(`[400] ${method} ${url} — Validation error:`, Object.keys(fields).join(", "));
        res.status(400).json({
            success: false,
            error: "Validation failed",
            fields,
        });
        return;
    }
    // MongoDB duplicate key error
    if (err.code === 11000) {
        const keyValue = err.keyValue || {};
        const key = Object.keys(keyValue)[0] || "field";
        console.warn(`[409] ${method} ${url} — Duplicate key: ${key}`);
        res.status(409).json({
            success: false,
            error: `A record with this ${key} already exists`,
            fields: { [key]: `Already exists` },
        });
        return;
    }
    // Body parser / malformed JSON errors
    if (err instanceof SyntaxError && "body" in err) {
        console.warn(`[400] ${method} ${url} — Malformed request body`);
        res.status(400).json({
            success: false,
            error: "Malformed request body",
        });
        return;
    }
    // Mongoose CastError (invalid ObjectId, etc.)
    if (err.name === "CastError") {
        console.warn(`[400] ${method} ${url} — Invalid ID format`);
        res.status(400).json({
            success: false,
            error: "Invalid resource identifier",
        });
        return;
    }
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    if (statusCode === 404) {
        console.warn(`[404] ${method} ${url} — Route not found. Check if the route is registered.`);
    }
    else if (statusCode >= 500) {
        console.error(`[${statusCode}] ${method} ${url} — Server error:`, err.message);
    }
    else {
        console.warn(`[${statusCode}] ${method} ${url} — ${err.message}`);
    }
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            fields: err.fields || undefined,
        });
        return;
    }
    console.error("Unhandled error:", err);
    res.status(500).json({
        success: false,
        error: "Internal server error",
    });
}
