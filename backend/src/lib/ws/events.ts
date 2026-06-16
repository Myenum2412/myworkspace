export type WsEventType =
  | "notification"
  | "user:status"
  | "task:created"
  | "task:updated"
  | "task:deleted"
  | "chat:message"
  | "activity:log"
  | "dashboard:metrics"
  | "team:update"
  | "project:sync"
  | "ping"
  | "pong";

export type WsEventPayload = {
  notification: {
    id: string;
    userId: string;
    type: string;
    title: string;
    message?: string;
    read: boolean;
    link?: string;
    createdAt: Date;
  };
  "user:status": {
    userId: string;
    status: "online" | "offline" | "break";
    name?: string;
  };
  "task:created": {
    id: string;
    title: string;
    status: string;
    priority: string;
    assigneeId?: string;
    creatorId: string;
    orgId: string;
  };
  "task:updated": {
    id: string;
    title?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    updatedAt: Date;
  };
  "task:deleted": {
    id: string;
    orgId: string;
  };
  "chat:message": {
    id: string;
    orgId: string;
    senderId: string;
    senderName: string;
    teamId?: string;
    content: string;
    createdAt: Date;
  };
  "activity:log": {
    id: string;
    orgId: string;
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    description: string;
    createdAt: Date;
  };
  "dashboard:metrics": {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    activeMembers: number;
    recentActivity: number;
  };
  "team:update": {
    teamId: string;
    name?: string;
    memberCount?: number;
  };
  "project:sync": {
    projectId: string;
    status: string;
    progress: number;
  };
  ping: Record<string, never>;
  pong: Record<string, never>;
};

export type WsEvent<T extends WsEventType = WsEventType> = {
  type: T;
  payload: WsEventPayload[T];
  timestamp: number;
};

export function createEvent<T extends WsEventType>(
  type: T,
  payload: WsEventPayload[T]
): WsEvent<T> {
  return { type, payload, timestamp: Date.now() };
}

export type WsClientMessage = {
  type: "subscribe" | "unsubscribe" | "pong";
  channels?: string[];
};

export type WsServerMessage = WsEvent | { type: "ping" } | { type: "error"; message: string };
