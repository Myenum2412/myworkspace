import { Server } from "http";
import { WsEvent, WsEventType } from "./events.js";
declare class WsManager {
    private wss;
    private clients;
    private channelMembers;
    initialize(server: Server): void;
    private handleMessage;
    private joinChannel;
    private leaveChannel;
    private removeClient;
    broadcast<T extends WsEventType>(event: WsEvent<T>): void;
    broadcastToOrg<T extends WsEventType>(orgId: string, event: WsEvent<T>): void;
    broadcastToUser<T extends WsEventType>(userId: string, event: WsEvent<T>): void;
    broadcastToChannel<T extends WsEventType>(channel: string, event: WsEvent<T>): void;
    getOnlineUsers(orgId: string): string[];
}
export declare const wsManager: WsManager;
export {};
