"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let tokenPromise: Promise<string | null> | null = null;

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

export function getSocketIO(token?: string): Socket {
  if (socket?.connected) return socket;

  if (!socket) {
    const cookieToken = resolveTokenFromCookie();
    const resolved: string | undefined = token || cookieToken || undefined;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    socket = io(apiUrl, {
      path: "/api/socketio",
      auth: { token: resolved },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      timeout: 20_000,
      closeOnBeforeunload: false,
    });

    socket.on("connect_error", (err) => {
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
