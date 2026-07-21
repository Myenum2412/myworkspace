"use client";

/**
 * WebSocket synchronization utility for multi-tab notification sync.
 * Uses BroadcastChannel API when available for cross-tab communication.
 */

const BROADCAST_CHANNEL = "notification-sync";

type SyncEvent =
  | { type: "notification:new"; payload: any }
  | { type: "notification:read"; id: string }
  | { type: "notification:read-all" }
  | { type: "notification:archive"; id: string }
  | { type: "notification:delete"; id: string }
  | { type: "unread:update"; count: number };

type SyncHandler = (event: SyncEvent) => void;

class WebSocketSync {
  private channel: BroadcastChannel | null = null;
  private handlers: Set<SyncHandler> = new Set();
  private initialized = false;

  init() {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL);
        this.channel.onmessage = (event) => {
          this.handlers.forEach((handler) => handler(event.data as SyncEvent));
        };
      } catch {
        // BroadcastChannel not available
      }
    }
  }

  send(event: SyncEvent) {
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {
        // Ignore broadcast errors
      }
    }
  }

  onMessage(handler: SyncHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.handlers.clear();
    this.initialized = false;
  }
}

export const wsSync = new WebSocketSync();

/**
 * Initialize cross-tab notification sync.
 * Call once in a layout or provider component.
 */
export function initNotificationSync() {
  wsSync.init();
}
