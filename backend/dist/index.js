import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDb } from "./lib/db/index.js";
import { wsManager } from "./lib/ws/server.js";
async function start() {
    const server = createServer(app);
    wsManager.initialize(server);
    server.listen(env.PORT, () => {
        console.log(`✦ MyWorkSpace API server running on http://localhost:${env.PORT}`);
        console.log(`✦ WebSocket server ready on ws://localhost:${env.PORT}/api/ws`);
        console.log(`✦ Environment: ${env.NODE_ENV}`);
    });
    connectDb().catch((err) => {
        console.error("✦ MongoDB connection failed:", err.message);
        console.error("✦ Server will still respond, but DB routes will return errors");
    });
}
start();
