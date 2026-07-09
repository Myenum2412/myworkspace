"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let tokenPromise: Promise<string | null> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30_000;
const HEARTBEAT_INTERVAL = 25_000;
const HEARTBEAT_TIMEOUT = 10_000;

interface OfflineEvent {
  event: string;
  data: unknown;
  timestamp: number;
}

const offlineBuffer: OfflineEvent[] = [];
const MAX_OFFLINE_BUFFER = 100;

function getBackoffDelay(): number {
  const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts);
  return Math.min(delay, RECONNECT_MAX_DELAY) + Math.random() * 1000;
}

function fetchSocketToken(): Promise<string | null> {
  if (tokenPromise) return tokenPromise;
  tokenPromise = (async () => {
    try {
      const res = await fetch("/api/auth/socket-token", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.token || null;
    } catch {
      return null;
    } finally {
      setTimeout(() => { tokenPromise = null; }, 5 * 60 * 1000);
    }
  })();
  return tokenPromise;
}

function resolveTokenFromCookie(): string | null {
  try {
    const secure = process.env.NEXTAUTH_URL?.startsWith("https") ? "__Secure-" : "";
    const name = `${secure}authjs.session-token`;
    const hit = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
    if (!hit) return null;
    return hit.slice(name.length + 1) || null;
  } catch {
    return null;
  }
}

function startHeartbeat(sock: Socket) {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (sock.connected) {
      const start = Date.now();
      sock.emit("ping", (response: unknown) => {
        const latency = Date.now() - start;
        if (latency > HEARTBEAT_TIMEOUT) {
          sock.disconnect();
          sock.connect();
        }
      });
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function flushOfflineBuffer(sock: Socket) {
  while (offlineBuffer.length > 0) {
    const buffered = offlineBuffer.shift();
    if (buffered) {
      sock.emit(buffered.event, buffered.data);
    }
  }
}

export function getSocketIO(token?: string): Socket {
  if (socket?.connected) {
    reconnectAttempts = 0;
    return socket;
  }

  if (!socket) {
    const cookieToken = resolveTokenFromCookie();
    const resolved: string | undefined = token || cookieToken || undefined;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    socket = io(apiUrl, {
      path: "/api/socketio",
      auth: { token: resolved },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_BASE_DELAY,
      reconnectionDelayMax: RECONNECT_MAX_DELAY,
      randomizationFactor: 0.5,
      timeout: 20_000,
      closeOnBeforeunload: false,
    });

    socket.on("connect", () => {
      reconnectAttempts = 0;
      startHeartbeat(socket!);
      flushOfflineBuffer(socket!);

      socket?.emit("presence:online", {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      });
    });

    socket.on("disconnect", (reason) => {
      stopHeartbeat();
      if (reason === "io server disconnect" || reason === "transport error") {
        tokenPromise = null;
      }
    });

    socket.on("connect_error", (err) => {
      reconnectAttempts++;
      if (/token|auth/i.test(err.message)) {
        tokenPromise = null;
      }
    });

    socket.on("pong", (latency: number) => {
      if (latency > HEARTBEAT_TIMEOUT) {
        socket?.disconnect();
        socket?.connect();
      }
    });
  }

  return socket;
}

export function disconnectSocketIO() {
  stopHeartbeat();
  if (socket) {
    socket.emit("presence:offline", { timestamp: Date.now() });
    socket.disconnect();
    socket = null;
  }
  reconnectAttempts = 0;
}

export function emitWithAck<T = unknown>(event: string, data: unknown, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      bufferOfflineEvent(event, data);
      reject(new Error("Socket not connected, event buffered"));
      return;
    }
    const timer = setTimeout(() => reject(new Error("Event acknowledgement timeout")), timeoutMs);
    socket!.emit(event, data, (response: T) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

export function emitSafe(event: string, data: unknown): void {
  if (socket?.connected) {
    socket.emit(event, data);
  } else {
    bufferOfflineEvent(event, data);
  }
}

export function bufferOfflineEvent(event: string, data: unknown): void {
  if (offlineBuffer.length >= MAX_OFFLINE_BUFFER) {
    offlineBuffer.shift();
  }
  offlineBuffer.push({ event, data, timestamp: Date.now() });
}

function flushOfflineBuffers(sock: Socket): void {
  flushOfflineBuffer(sock);
}

export function getConnectionState(): "connected" | "disconnected" | "reconnecting" {
  if (!socket) return "disconnected";
  if (socket.connected) return "connected";
  if (socket.io?.engine?.transport?.writable) return "reconnecting";
  return "disconnected";
}

export type SessionStatus = "online" | "break" | "offline";

export interface SessionUpdate {
  sessionId: string;
  status: SessionStatus;
  previousStatus?: SessionStatus;
  timestamp: string;
}