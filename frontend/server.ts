import { createServer } from "http";
import next from "next";
import { connectToMongo } from "./lib/db";
import { wsManager } from "./lib/ws/server";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  await connectToMongo().catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
  });

  const server = createServer((req, res) => {
    handle(req, res);
  });

  wsManager.initialize(server);

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`> Port ${port} is already in use. Stop the existing server or start with PORT=<free-port>.`);
    } else {
      console.error("> Server failed to start:", err.message);
    }
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws`);
  });
});
