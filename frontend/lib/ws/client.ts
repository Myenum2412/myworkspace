"use client";

import { io, Socket } from "socket.io-client";

export type WsConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

type WsEventCallback<T = any> = (data: { type: string; payload: T; timestamp: number }) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<WsEventCallback>>();
  private userId: string = "";
  private orgId: string = "";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private stateChangeCallback: ((state: WsConnectionState) => void) | null = null;

  connect(userId: string, orgId: string) {
    this.userId = userId;
    this.orgId = orgId;
    this.attemptConnection();
  }

  private attemptConnection() {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
    const url = `${baseUrl}/api/ws?userId=${this.userId}&orgId=${this.orgId}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.stateChangeCallback?.("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ping") {
          this.send({ type: "pong" });
          return;
        }
        this.emit(data.type, data);
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.stateChangeCallback?.("disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.stateChangeCallback?.("reconnecting");
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    setTimeout(() => this.attemptConnection(), delay);
  }

  disconnect() {
    this.maxReconnectAttempts = 0;
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  subscribe(channels: string[]) {
    this.send({ type: "subscribe", channels });
  }

  unsubscribe(channels: string[]) {
    this.send({ type: "unsubscribe", channels });
  }

  on<T = any>(type: string, callback: WsEventCallback<T>) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback as WsEventCallback);
    return () => this.listeners.get(type)?.delete(callback as WsEventCallback);
  }

  private emit(type: string, data: any) {
    this.listeners.get(type)?.forEach((cb) => cb(data));
    this.listeners.get("*")?.forEach((cb) => cb(data));
  }

  onStateChange(callback: (state: WsConnectionState) => void) {
    this.stateChangeCallback = callback;
  }

  getState(): WsConnectionState {
    if (!this.ws) return "disconnected";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return "connecting";
      case WebSocket.OPEN: return "connected";
      case WebSocket.CLOSING: return "disconnected";
      case WebSocket.CLOSED: return "disconnected";
      default: return "disconnected";
    }
  }
}

let globalClient: WsClient | null = null;

export function getWsClient(): WsClient {
  if (!globalClient) {
    globalClient = new WsClient();
  }
  return globalClient;
}

type EventCallback = (event: string, data: unknown) => void;

const SOCKET_PATH = "/api/socketio";

export class SocketIOClient {
  private socket: Socket | null = null;
  private listeners: Set<EventCallback> = new Set();
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private userId: string | null = null;
  private orgId: string | null = null;

  async connect(userId: string, orgId?: string) {
    if (this.socket?.connected) return;

    this.userId = userId;
    this.orgId = orgId || null;

    const token = await this.getAuthToken();

    this.socket = io({
      path: SOCKET_PATH,
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    this.socket.on("connect", () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.notifyListeners("socket:connected", { userId, orgId });
    });

    this.socket.on("disconnect", (reason) => {
      this.connected = false;
      this.notifyListeners("socket:disconnected", { reason });
    });

    this.socket.on("connect_error", (error) => {
      this.reconnectAttempts++;
      this.notifyListeners("socket:error", { error: error.message, attempts: this.reconnectAttempts });
    });

    this.socket.on("upload:started", (data) => this.notifyListeners("upload:started", data));
    this.socket.on("upload:completed", (data) => this.notifyListeners("upload:completed", data));
    this.socket.on("upload:failed", (data) => this.notifyListeners("upload:failed", data));
    this.socket.on("upload:cancelled", (data) => this.notifyListeners("upload:cancelled", data));
    this.socket.on("file:uploaded", (data) => this.notifyListeners("file:uploaded", data));
    this.socket.on("file:deleted", (data) => this.notifyListeners("file:deleted", data));
    this.socket.on("file:restored", (data) => this.notifyListeners("file:restored", data));
    this.socket.on("file:updated", (data) => this.notifyListeners("file:updated", data));
    this.socket.on("file:metadata-saved", (data) => this.notifyListeners("file:metadata-saved", data));
    this.socket.on("file:version-created", (data) => this.notifyListeners("file:version-created", data));
    this.socket.on("session:status:updated", (data) => this.notifyListeners("session:status:updated", data));
    this.socket.on("user:status:changed", (data) => this.notifyListeners("user:status:changed", data));
  }

  private async getAuthToken(): Promise<string> {
    const token = localStorage.getItem("auth-token");
    if (token) return token;
    try {
      const res = await fetch("/api/auth/socket-token");
      if (res.ok) {
        const data = await res.json();
        return data.token || "";
      }
    } catch {}
    return "";
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
  }

  onEvent(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(event: string, data: unknown) {
    this.listeners.forEach((cb) => cb(event, data));
  }

  emit(event: string, data: unknown) {
    this.socket?.emit(event, data);
  }

  isConnected(): boolean {
    return this.connected;
  }

  joinOrg(orgId: string) {
    this.orgId = orgId;
    this.emit("org:join", { orgId });
  }

  leaveOrg(orgId: string) {
    this.emit("org:leave", { orgId });
  }
}

export const socketIOManager = new SocketIOClient();
