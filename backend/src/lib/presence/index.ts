import { logger } from "../logger/index.js";
import { socketIOManager } from "../socketio/index.js";

export type PresenceStatus = "online" | "offline" | "idle" | "busy" | "in-call";

interface PresenceEntry {
  userId: string;
  orgId?: string;
  status: PresenceStatus;
  lastActiveAt: number;
  socketIds: Set<number>;
}

/**
 * In-memory presence registry. Keeps track of every live user and their
 * current activity status. Presence is broadcast to the user's org room so
 * that all connected clients get near real-time updates.
 *
 * Idle detection relies on a heartbeat sent by clients (`presence:heartbeat`).
 * A background sweeper promotes stale sessions to "idle" and drops sockets
 * that stopped reporting activity entirely.
 */
export class PresenceRegistry {
  private map = new Map<string, PresenceEntry>();
  private sweeper: NodeJS.Timeout | null = null;

  /** Timestamp of the most recent broadcast, used to coalesce updates. */
  private timers = new Map<string, NodeJS.Timeout>();

  get size() {
    return this.map.size;
  }

  startSweeper(intervalMs = 30_000) {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [userId, entry] of this.map) {
        if (now - entry.lastActiveAt > 60_000 && entry.status !== "offline") {
          if (entry.status === "busy" || entry.status === "in-call") continue;
          entry.status = "idle";
          entry.lastActiveAt = now;
          changed = true;
          this.broadcast(userId, entry);
        }
      }
      if (changed) logger.debug("Presence sweeper updated idle statuses");
    }, intervalMs);
    this.sweeper.unref?.();
  }

  stopSweeper() {
    if (this.sweeper) {
      clearInterval(this.sweeper);
      this.sweeper = null;
    }
  }

  /** Register (or refresh) a user as online. orgId is optional. */
  online(userId: string, orgId?: string, socketId?: number): PresenceEntry {
    const existing = this.map.get(userId);
    const entry: PresenceEntry = existing ?? {
      userId,
      orgId,
      status: "online",
      lastActiveAt: Date.now(),
      socketIds: new Set(),
    };
    entry.orgId = orgId ?? entry.orgId;
    entry.status =
      existing?.status === "busy" || existing?.status === "in-call" ? entry.status : "online";
    entry.lastActiveAt = Date.now();
    if (socketId !== undefined && !entry.socketIds.has(socketId)) entry.socketIds.add(socketId);
    this.map.set(userId, entry);
    this.broadcast(userId, entry);
    return entry;
  }

  /** Mark a user idle / busy / in-call. */
  status(userId: string, status: PresenceStatus) {
    const entry = this.map.get(userId);
    if (!entry) return;
    entry.status = status;
    entry.lastActiveAt = Date.now();
    this.broadcast(userId, entry);
  }

  /** Refresh activity timestamp (client heartbeat). */
  heartbeat(userId: string) {
    const entry = this.map.get(userId);
    if (!entry) return;
    entry.lastActiveAt = Date.now();
    if (entry.status === "idle") {
      entry.status = "online";
      this.broadcast(userId, entry);
    }
  }

  /** Remove a socket; when the last socket leaves the user goes offline. */
  offline(userId: string, socketId?: number) {
    const entry = this.map.get(userId);
    if (!entry) return;
    if (socketId !== undefined) {
      entry.socketIds.delete(socketId);
    }
    if (entry.socketIds.size > 0) return;
    entry.status = "offline";
    entry.lastActiveAt = Date.now();
    this.broadcast(userId, entry);
  }

  /**
   * Remove any lingering presence for a user whose socket disconnected
   * unexpectedly (fallback when we have no tracked socket ids).
   */
  forceOffline(userId: string) {
    const entry = this.map.get(userId);
    if (!entry) return;
    entry.status = "offline";
    this.broadcast(userId, entry);
  }

  get(userId: string): PresenceEntry | undefined {
    return this.map.get(userId);
  }

  getAll(): PresenceEntry[] {
    return [...this.map.values()];
  }

  getOrg(orgId: string): PresenceEntry[] {
    return [...this.map.values()].filter((e) => e.orgId === orgId);
  }

  private broadcast(userId: string, entry: PresenceEntry) {
    if (!entry.orgId) return;
    // Coalesce bursts (online + status updates firing together).
    const key = `${entry.orgId}:${userId}`;
    const pending = this.timers.get(key);
    if (pending) return;
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        const latest = this.map.get(userId);
        if (!latest) return;
        socketIOManager.emitToOrg(latest.orgId ?? "", "presence:update", {
          userId,
          status: latest.status,
          lastActiveAt: latest.lastActiveAt,
          at: Date.now(),
        });
      }, 50),
    );
    this.timers.get(key)?.unref?.();
  }
}

export const presenceRegistry = new PresenceRegistry();
