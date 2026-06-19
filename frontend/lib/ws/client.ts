"use client";

export type WsConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on<T = any>(type: string, callback: WsEventCallback<T>) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback as WsEventCallback);
    return () => this.listeners.get(type)?.delete(callback as WsEventCallback);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
