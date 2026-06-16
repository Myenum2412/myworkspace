import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";
import { connectDb } from "./lib/db";
import { wsManager } from "./lib/ws/server";

async function start() {
  await connectDb();

  const server = createServer(app);

  wsManager.initialize(server);

  server.listen(env.PORT, () => {
    console.log(`✦ MyWorkSpace API server running on http://localhost:${env.PORT}`);
    console.log(`✦ WebSocket server ready on ws://localhost:${env.PORT}/api/ws`);
    console.log(`✦ Environment: ${env.NODE_ENV}`);
  });
}

start().catch(console.error);
