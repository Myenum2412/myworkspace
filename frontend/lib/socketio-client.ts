"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocketIO(token?: string): Socket {
  if (socket?.connected) return socket;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  socket = io(apiUrl, {
    path: "/api/socketio",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[SocketIO] Connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[SocketIO] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[SocketIO] Connection error:", err.message);
  });

  return socket;
}

export function disconnectSocketIO() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export type SessionStatus = "online" | "break" | "offline";

export interface SessionUpdate {
  sessionId: string;
  status: SessionStatus;
  previousStatus?: SessionStatus;
  timestamp: string;
}
