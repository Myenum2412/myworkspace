"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let tokenPromise: Promise<string | null> | null = null;

// Fetch a short-lived socket bearer token (works around the httpOnly session
// cookie that JS cannot read). Cache the in-flight promise so concurrent
// callers share one request.
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
      // Let a future reconnect retry the token.
      setTimeout(() => { tokenPromise = null; }, 5 * 60 * 1000);
    }
  })();
  return tokenPromise;
}

/**
 * Read the NextAuth JWT straight from the session cookie. Auth.js stores the
 * base64url-encoded JWE in `authjs.session-token` (prefixed `__Secure-` on
 * https). This is the token the backend Socket.IO middleware expects. We parse
 * it synchronously so callers remain synchronous: attaching a `.on` listener
 * immediately works even while the socket handshakes (socket.io queues local
 * events until the transport is open, so nothing is lost).
 */
function resolveTokenFromCookie(): string | null {
  try {
    const secure = process.env.NEXTAUTH_URL?.startsWith("https") ? "__Secure-" : "";
    const name = `${secure}authjs.session-token`;
    const hit = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
    if (!hit) return null;
    // Cookie value is the raw JWE compact serialization — pass through as-is.
    return hit.slice(name.length + 1) || null;
  } catch {
    return null;
  }
}

export function getSocketIO(token?: string): Socket {
  if (socket?.connected) return socket;

  if (!socket) {
    // Token priority: explicit > httpOnly-safe endpoint > cookie fallback
    // (cookie only works if httpOnly is disabled, which it usually isn't).
    const cookieToken = resolveTokenFromCookie();
    const resolved: string | undefined = token || cookieToken || undefined;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    socket = io(apiUrl, {
      path: "/api/socketio",
      auth: { token: resolved },
      // Prefer websocket only — lower latency on local net. Polling fallback is
      // kept for environments that tunnel WS.
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[SocketIO] Connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      // On a server-forced disconnect or auth failure, force a fresh socket-token
      // on the next reconnect so expired / invalid tokens don't loop forever.
      if (reason === "io server disconnect" || reason === "transport error") {
        tokenPromise = null;
      }
    });

    socket.on("connect_error", (err) => {
      console.error("[SocketIO] Connection error:", err.message);
      // "Invalid token" → drop cached promise so the next connect fetches fresh.
      if (/token|auth/i.test(err.message)) {
        tokenPromise = null;
      }
    });
  }

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
