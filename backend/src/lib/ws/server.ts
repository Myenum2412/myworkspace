import { WebSocketServer, WebSocket as WsSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { createEvent, WsEvent, WsEventType, WsClientMessage } from "./events.js";

interface Client {
  ws: WsSocket;
  userId: string;
  orgId: string;
  channels: Set<string>;
  lastPing: number;
}

class WsManager {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, Client>();
  private channelMembers = new Map<string, Set<string>>();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/api/ws" });

    this.wss.on("connection", (ws: WsSocket, req: IncomingMessage) => {
      const url = new URL(req.url || "", "http://localhost");
      const userId = url.searchParams.get("userId") || "anonymous";
      const orgId = url.searchParams.get("orgId") || "default";
      const clientId = `${userId}-${Date.now()}`;

      const client: Client = {
        ws,
        userId,
        orgId,
        channels: new Set([`org:${orgId}`]),
        lastPing: Date.now(),
      };

      this.clients.set(clientId, client);
      this.joinChannel(clientId, `org:${orgId}`);
      this.joinChannel(clientId, `user:${userId}`);

      ws.on("message", (data: Buffer) => {
        try {
          const msg: WsClientMessage = JSON.parse(data.toString());
          this.handleMessage(clientId, msg);
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
        }
      });

      ws.on("close", () => {
        this.removeClient(clientId);
      });

      ws.on("pong", () => {
        const c = this.clients.get(clientId);
        if (c) c.lastPing = Date.now();
      });

      ws.send(JSON.stringify(createEvent("notification", {
        id: "connected",
        userId,
        type: "system",
        title: "Connected",
        message: "WebSocket connection established",
        read: true,
        createdAt: new Date(),
      })));
    });

    const interval = setInterval(() => {
      this.clients.forEach((client, id) => {
        if (Date.now() - client.lastPing > 30000) {
          client.ws.terminate();
          this.clients.delete(id);
        } else {
          client.ws.ping();
        }
      });
    }, 15000);

    this.wss.on("close", () => clearInterval(interval));
  }

  private handleMessage(clientId: string, msg: WsClientMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (msg.type) {
      case "subscribe":
        msg.channels?.forEach((ch) => {
          client.channels.add(ch);
          this.joinChannel(clientId, ch);
        });
        break;
      case "unsubscribe":
        msg.channels?.forEach((ch) => {
          client.channels.delete(ch);
          this.leaveChannel(clientId, ch);
        });
        break;
      case "pong":
        client.lastPing = Date.now();
        break;
    }
  }

  private joinChannel(clientId: string, channel: string) {
    if (!this.channelMembers.has(channel)) {
      this.channelMembers.set(channel, new Set());
    }
    this.channelMembers.get(channel)!.add(clientId);
  }

  private leaveChannel(clientId: string, channel: string) {
    this.channelMembers.get(channel)?.delete(clientId);
  }

  private removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.channels.forEach((ch) => this.leaveChannel(clientId, ch));
      this.clients.delete(clientId);
      this.broadcastToOrg(client.orgId, createEvent("user:status", {
        userId: client.userId,
        status: "offline",
      }));
    }
  }

  broadcast<T extends WsEventType>(event: WsEvent<T>) {
    const data = JSON.stringify(event);
    this.clients.forEach((client) => {
      if (client.ws.readyState === WsSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  broadcastToOrg<T extends WsEventType>(orgId: string, event: WsEvent<T>) {
    const channel = `org:${orgId}`;
    const members = this.channelMembers.get(channel);
    if (!members) return;
    const data = JSON.stringify(event);
    members.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client?.ws.readyState === WsSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  broadcastToUser<T extends WsEventType>(userId: string, event: WsEvent<T>) {
    const channel = `user:${userId}`;
    const members = this.channelMembers.get(channel);
    if (!members) return;
    const data = JSON.stringify(event);
    members.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client?.ws.readyState === WsSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  broadcastToChannel<T extends WsEventType>(channel: string, event: WsEvent<T>) {
    const members = this.channelMembers.get(channel);
    if (!members) return;
    const data = JSON.stringify(event);
    members.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client?.ws.readyState === WsSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  getOnlineUsers(orgId: string): string[] {
    const channel = `org:${orgId}`;
    const members = this.channelMembers.get(channel);
    if (!members) return [];
    return Array.from(members)
      .map((id) => this.clients.get(id)?.userId)
      .filter(Boolean) as string[];
  }
}

export const wsManager = new WsManager();
