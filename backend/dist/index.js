import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDb } from "./lib/db/index.js";
import { wsManager } from "./lib/ws/server.js";
import { socketIOManager } from "./lib/socketio/index.js";
import { initializeAgenda } from "./lib/agenda/index.js";
async function start() {
    const server = createServer(app);
    // Initialize WebSocket (existing) and Socket.IO
    wsManager.initialize(server);
    socketIOManager.initialize(server);
    server.listen(env.PORT, () => {
        console.log(`✦ MyWorkSpace API server running on http://localhost:${env.PORT}`);
        console.log(`✦ WebSocket server ready on ws://localhost:${env.PORT}/api/ws`);
        console.log(`✦ Socket.IO ready on http://localhost:${env.PORT}/api/socketio`);
        console.log(`✦ Environment: ${env.NODE_ENV}`);
    });
    await connectDb().catch((err) => {
        console.error("✦ MongoDB connection failed:", err.message);
        console.error("✦ Server will still respond, but DB routes will return errors");
    });
    // Initialize Agenda scheduler after DB connection
    initializeAgenda().catch((err) => {
        console.error("✦ Agenda.js initialization failed:", err.message);
    });
}
start();
