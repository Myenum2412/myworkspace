import { WebSocketServer, WebSocket as WsSocket } from "ws";
import { createEvent } from "./events.js";
class WsManager {
    wss = null;
    clients = new Map();
    channelMembers = new Map();
    initialize(server) {
        this.wss = new WebSocketServer({ server, path: "/api/ws" });
        this.wss.on("connection", (ws, req) => {
            const url = new URL(req.url || "", "http://localhost");
            const userId = url.searchParams.get("userId") || "anonymous";
            const orgId = url.searchParams.get("orgId") || "default";
            const clientId = `${userId}-${Date.now()}`;
            const client = {
                ws,
                userId,
                orgId,
                channels: new Set([`org:${orgId}`]),
                lastPing: Date.now(),
            };
            this.clients.set(clientId, client);
            this.joinChannel(clientId, `org:${orgId}`);
            this.joinChannel(clientId, `user:${userId}`);
            ws.on("message", (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    this.handleMessage(clientId, msg);
                }
                catch {
                    ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
                }
            });
            ws.on("close", () => {
                this.removeClient(clientId);
            });
            ws.on("pong", () => {
                const c = this.clients.get(clientId);
                if (c)
                    c.lastPing = Date.now();
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
                }
                else {
                    client.ws.ping();
                }
            });
        }, 15000);
        this.wss.on("close", () => clearInterval(interval));
    }
    handleMessage(clientId, msg) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
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
    joinChannel(clientId, channel) {
        if (!this.channelMembers.has(channel)) {
            this.channelMembers.set(channel, new Set());
        }
        this.channelMembers.get(channel).add(clientId);
    }
    leaveChannel(clientId, channel) {
        this.channelMembers.get(channel)?.delete(clientId);
    }
    removeClient(clientId) {
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
    broadcast(event) {
        const data = JSON.stringify(event);
        this.clients.forEach((client) => {
            if (client.ws.readyState === WsSocket.OPEN) {
                client.ws.send(data);
            }
        });
    }
    broadcastToOrg(orgId, event) {
        const channel = `org:${orgId}`;
        const members = this.channelMembers.get(channel);
        if (!members)
            return;
        const data = JSON.stringify(event);
        members.forEach((clientId) => {
            const client = this.clients.get(clientId);
            if (client?.ws.readyState === WsSocket.OPEN) {
                client.ws.send(data);
            }
        });
    }
    broadcastToUser(userId, event) {
        const channel = `user:${userId}`;
        const members = this.channelMembers.get(channel);
        if (!members)
            return;
        const data = JSON.stringify(event);
        members.forEach((clientId) => {
            const client = this.clients.get(clientId);
            if (client?.ws.readyState === WsSocket.OPEN) {
                client.ws.send(data);
            }
        });
    }
    broadcastToChannel(channel, event) {
        const members = this.channelMembers.get(channel);
        if (!members)
            return;
        const data = JSON.stringify(event);
        members.forEach((clientId) => {
            const client = this.clients.get(clientId);
            if (client?.ws.readyState === WsSocket.OPEN) {
                client.ws.send(data);
            }
        });
    }
    getOnlineUsers(orgId) {
        const channel = `org:${orgId}`;
        const members = this.channelMembers.get(channel);
        if (!members)
            return [];
        return Array.from(members)
            .map((id) => this.clients.get(id)?.userId)
            .filter(Boolean);
    }
}
export const wsManager = new WsManager();
