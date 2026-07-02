"use client";

/**
 * WebSocket client adapter — bridges legacy WS imports to the existing
 * Socket.IO client so the migration from raw WS to Socket.IO doesn't
 * require rewriting every consuming component.
 *
 * Remove this module once all consumers are migrated to socket.io-client directly.
 */

import { io, Socket } from "socket.io-client";

export type WsConnectionState = "connected" | "connecting" | "disconnected";

interface ListenerEntry {
  event: string;
  handler: (...args: unknown[]) => void;
}

class SocketIOWsClient {
  private socket: Socket | null = null;
  private listeners: ListenerEntry[] = [];
  private stateListeners: Array<(state: WsConnectionState) => void> = [];
  private _state: WsConnectionState = "disconnected";

  private setState(state: WsConnectionState) {
    this._state = state;
    this.stateListeners.forEach((fn) => fn(state));
  }

  getState(): WsConnectionState {
    return this._state;
  }

  onStateChange(listener: (state: WsConnectionState) => void) {
    this.stateListeners.push(listener);
    // emit current state
    listener(this._state);
  }

  connect(userId: string, orgId: string, token?: string) {
    if (this.socket?.connected) return;

    this.setState("connecting");

    // Resolve token from cookie if not explicitly provided
    let resolvedToken = token;
    if (!resolvedToken) {
      try {
        const secure = process.env.NEXTAUTH_URL?.startsWith("https") ? "__Secure-" : "";
        const name = `${secure}authjs.session-token`;
        const hit = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
        if (hit) resolvedToken = hit.slice(name.length + 1) || undefined;
      } catch {
        // cookie not readable
      }
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    this.socket = io(apiUrl, {
      path: "/api/socketio",
      auth: { token: resolvedToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      this.setState("connected");
    });

    this.socket.on("disconnect", () => {
      this.setState("disconnected");
    });

    this.socket.on("connect_error", () => {
      this.setState("disconnected");
    });

    // Re-register all listeners on the new socket
    for (const entry of this.listeners) {
      this.socket.on(entry.event, entry.handler);
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.setState("disconnected");
  }

  on(event: string, handler: (...args: unknown[]) => void): () => void {
    this.listeners.push({ event, handler });
    this.socket?.on(event, handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: (...args: unknown[]) => void) {
    this.listeners = this.listeners.filter(
      (l) => !(l.event === event && l.handler === handler)
    );
    this.socket?.off(event, handler);
  }

  emit(event: string, ...args: unknown[]) {
    this.socket?.emit(event, ...args);
  }

  send(data: Record<string, unknown>) {
    if (data.type) {
      this.socket?.emit(data.type as string, data.payload || {});
    }
  }

  subscribe(channels: string[]) {
    this.socket?.emit("subscribe", { channels });
  }

  unsubscribe(channels: string[]) {
    this.socket?.emit("unsubscribe", { channels });
  }

  onEvent(handler: (event: string, data: unknown) => void): () => void {
    const wrapper = (event: string, ...args: unknown[]) => {
      handler(event, args[0]);
    };
    // Socket.IO doesn't have a generic catch-all without a wildcard plugin.
    // We register a prefix listener approach here — extend as needed.
    const cleanups: (() => void)[] = [];
    const prefixes = ["notification", "task:", "file:", "upload:", "session:", "user:", "client:", "org:"];
    for (const prefix of prefixes) {
      // Register per-prefix; accumulate cleanups.
      const unsub = this.on(prefix.replace(":", ""), (...args: unknown[]) => {
        handler(prefix, args[0]);
      });
      cleanups.push(unsub);
    }
    return () => cleanups.forEach((fn) => fn());
  }
}

let instance: SocketIOWsClient | null = null;

export function getWsClient(): SocketIOWsClient {
  if (!instance) {
    instance = new SocketIOWsClient();
  }
  return instance;
}

export const socketIOManager = {
  onEvent: (handler: (event: string, data: unknown) => void): (() => void) => {
    return getWsClient().onEvent(handler);
  },
  emitToUser: (_userId: string, event: string, data: unknown) => {
    getWsClient().emit(event, data);
  },
  emitToOrg: (_orgId: string, event: string, data: unknown) => {
    getWsClient().emit(event, data);
  },
};
