"use client";

/**
 * WebSocket event type definitions — mirrors the Socket.IO event contract
 * between frontend and backend. Keep in sync with backend SocketIO events.
 */

export interface WsEventPayload {
  /** Session status changed */
  "session:status:updated": {
    userId: string;
    status: "online" | "break" | "offline";
    sessionId?: string;
    timestamp: string;
  };

  /** User online status changed */
  "user:status": {
    userId: string;
    status: "online" | "offline" | "break";
    timestamp: string;
  };

  /** Notification received */
  notification: {
    id: string;
    userId: string;
    type: string;
    title: string;
    message?: string;
    read: boolean;
    link?: string;
    createdAt: string;
  };

  /** Task created */
  "task:created": {
    id: string;
    orgId: string;
    title: string;
    status: string;
    priority: string;
    assigneeId?: string;
    assigneeName?: string;
    creatorId: string;
    creatorName?: string;
    dueDate?: string | null;
    createdAt: string;
  };

  /** Task updated */
  "task:updated": {
    id: string;
    orgId: string;
    title?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    updatedAt: string;
  };

  /** Task deleted */
  "task:deleted": {
    id: string;
    orgId: string;
  };

  /** Batch task status update */
  "task:batch-updated": {
    ids: string[];
    status: string;
  };

  /** File upload event */
  "file:uploaded": {
    id: string;
    name: string;
    orgId: string;
    size: number;
    mimeType: string;
    url: string;
  };

  /** Client created/updated/deleted */
  "client:created": {
    id: string;
    orgId: string;
    name: string;
  };

  "client:updated": {
    id: string;
    orgId: string;
    name: string;
    updatedAt: string;
  };

  "client:deleted": {
    id: string;
    orgId: string;
  };
}

export type WsEventType = keyof WsEventPayload;
