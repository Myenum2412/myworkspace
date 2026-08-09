"use client";

import { io, type Socket } from "socket.io-client";

/**
 * Singleton Socket.IO client.
 *
 * The backend Socket.IO server authenticates connections with a short-lived JWT
 * issued by `GET /api/auth/socket-token` (signed with JWT_SECRET, purpose
 * "socket"). The browser cannot reuse the NextAuth session cookie here — it is
 * an encrypted JWE, not a JWT this server can verify. So we must fetch a valid
 * socket token first, then connect.
 *
 * Because the token only lives ~60s, we refetch before every (re)connect so
 * reconnects never fail auth.
 */

let socket: Socket | null = null;
let tokenPromise: Promise<string | null> | null = null;
let connectPromise: Promise<Socket> | null = null;

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
      setTimeout(() => {
        tokenPromise = null;
      }, 45_000);
    }
  })();
  return tokenPromise;
}

/**
 * Return the shared socket. Creates it lazily. If the socket is not connected
 * yet (or needs a fresh token after a failed auth), schedules a connect.
 * Listeners may attach immediately; emits are buffered until connected.
 */
export function getSocketIO(): Socket {
  if (socket) {
    if (!socket.connected && !socket.active) connectWithToken();
    return socket;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  socket = io(apiUrl, {
    path: "/api/socketio",
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    timeout: 20_000,
    closeOnBeforeunload: false,
  });

  // Increase listener limit to prevent MaxListenersExceededWarning.
  // Multiple components (tabs, hooks) can attach listeners to this
  // shared singleton; all are properly removed on unmount.
  (socket as unknown as { setMaxListeners?: (n: number) => void }).setMaxListeners?.(50);

  socket.on("connect_error", (err) => {
    if (/token|auth/i.test(err.message)) {
      tokenPromise = null;
      // Retry with a freshly minted token.
      connectWithToken();
    }
  });

  connectWithToken();
  return socket;
}

let connecting = false;
function connectWithToken() {
  if (!socket || socket.connected || socket.active || connecting) return;
  connecting = true;
  fetchSocketToken()
    .then((token) => {
      if (!socket) return;
      socket.auth = { token: token || undefined };
      if (!socket.connected && !socket.active) socket.connect();
    })
    .catch(() => {})
    .finally(() => {
      connecting = false;
    });
}

export function disconnectSocketIO() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function waitForSocketConnection(timeoutMs = 10_000): Promise<Socket> {
  const s = getSocketIO();
  if (s.connected) return Promise.resolve(s);
  if (!connectPromise) {
    connectPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Socket connection timeout"));
      }, timeoutMs);
      const onConnect = () => {
        cleanup();
        resolve(s);
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        clearTimeout(timer);
        s.off("connect", onConnect);
        s.off("connect_error", onError);
        connectPromise = null;
      };
      s.once("connect", onConnect);
      s.once("connect_error", onError);
    });
  }
  return connectPromise;
}
