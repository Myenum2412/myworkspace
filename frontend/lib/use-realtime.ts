"use client";

import type { Session } from "next-auth";
import { useCallback, useEffect, useState } from "react";
import { getSocketIO } from "@/lib/socketio-client";

export type PresenceStatus = "online" | "offline" | "idle" | "busy" | "in-call";

export interface PresenceState {
  userId: string;
  status: PresenceStatus;
  lastActiveAt: number;
}

export type CallStatus = "scheduled" | "active" | "ended" | "cancelled" | "missed";

export interface CallParticipant {
  userId: string;
  name: string;
  avatar?: string;
  joinedAt: string;
  audio: boolean;
  video: boolean;
  screen: boolean;
  handRaised: boolean;
}

export interface CallMessage {
  id: string;
  userId: string;
  name: string;
  text: string;
  type: "text" | "file" | "system";
  createdAt: string;
}

export interface CallSummary {
  id: string;
  orgId: string;
  channelId?: string;
  name: string;
  type: "dm" | "group" | "channel";
  media?: "video" | "audio";
  status: CallStatus;
  initiatorId: string;
  participants: CallParticipant[];
  invitees: string[];
  maxParticipants: number;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  recording: boolean;
  mutedAll: boolean;
  messages?: CallMessage[];
  logs?: Array<{ id: string; userId: string; name: string; action: string; at: string }>;
  createdAt: string;
}

export interface IncomingCall {
  call: CallSummary;
  by: { id: string; name: string };
}

interface Options {
  session?: Session | null;
  enabled?: boolean;
}

export function useRealtime(options?: Options) {
  const session = options?.session;
  const enabled = options?.enabled !== false;
  const userId = session?.user?.id;
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Record<string, PresenceState>>({});
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<CallSummary | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;
    let disposed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const socket = getSocketIO();

    const onConnect = () => {
      if (disposed) return;
      setConnected(true);
      socket.emit("presence:heartbeat");
    };
    const onConnectError = () => setConnected(false);
    const onDisconnect = () => setConnected(false);
    const onPresenceSnapshot = (data: {
      presence: Array<{ userId: string; status: PresenceStatus; lastActiveAt: number }>;
    }) => {
      if (disposed) return;
      const next: Record<string, PresenceState> = {};
      for (const entry of data?.presence || []) {
        next[entry.userId] = {
          userId: entry.userId,
          status: entry.status,
          lastActiveAt: entry.lastActiveAt,
        };
      }
      setPresence((prev) => ({ ...prev, ...next }));
    };
    const onPresenceUpdate = (data: {
      userId: string;
      status: PresenceStatus;
      lastActiveAt: number;
      at?: number;
    }) => {
      if (disposed) return;
      setPresence((prev) => ({
        ...prev,
        [data.userId]: {
          userId: data.userId,
          status: data.status,
          lastActiveAt: data.lastActiveAt,
        },
      }));
    };
    const onInvite = (data: IncomingCall) => {
      if (disposed) return;
      setIncomingCall(data);
    };
    const onCallUpdate = (data: { call?: CallSummary; callId?: string }) => {
      if (disposed || !data.call) return;
      setActiveCall((prev) => Object.assign({}, prev, data.call));
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    socket.on("presence:snapshot", onPresenceSnapshot);
    socket.on("presence:update", onPresenceUpdate);
    socket.on("call:invite", onInvite);
    socket.on("call:created", onCallUpdate);
    socket.on("call:participant-joined", onCallUpdate);
    socket.on("call:participant-left", onCallUpdate);
    socket.on("call:state", (d: { call?: CallSummary }) => {
      if (disposed || !d?.call) return;
      setActiveCall((prev) => Object.assign({}, prev, d.call));
    });
    socket.on("call:hand-raise", (d: { call?: CallSummary }) => {
      if (disposed || !d?.call) return;
      setActiveCall((prev) => Object.assign({}, prev, d.call));
    });
    socket.on("call:recording", (d: { call?: CallSummary }) => {
      if (disposed || !d?.call) return;
      setActiveCall((prev) => Object.assign({}, prev, d.call));
    });
    socket.on("call:rescheduled", onCallUpdate);
    socket.on("call:message", (d: { call?: CallSummary }) => {
      if (disposed || !d?.call) return;
      setActiveCall((prev) => Object.assign({}, prev, d.call));
    });
    socket.on("call:ended", (d: { call?: CallSummary }) => {
      if (disposed) return;
      if (d?.call?.status === "ended")
        setActiveCall((prev) => prev && Object.assign({}, prev, d.call));
      else setActiveCall(null);
    });
    socket.on("call:cancelled", (d: { call?: CallSummary }) => {
      if (disposed) return;
      if (d?.call) setActiveCall((prev) => prev && Object.assign({}, prev, d.call));
      else setActiveCall(null);
    });

    heartbeat = setInterval(() => {
      socket.emit("presence:heartbeat");
    }, 25_000);

    return () => {
      disposed = true;
      if (heartbeat) clearInterval(heartbeat);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.off("presence:snapshot", onPresenceSnapshot);
      socket.off("presence:update", onPresenceUpdate);
      socket.off("call:invite", onInvite);
      socket.off("call:created", onCallUpdate);
      socket.off("call:participant-joined", onCallUpdate);
      socket.off("call:participant-left", onCallUpdate);
      socket.off("call:state");
      socket.off("call:hand-raise");
      socket.off("call:recording");
      socket.off("call:rescheduled", onCallUpdate);
      socket.off("call:message");
      socket.off("call:ended");
      socket.off("call:cancelled");
    };
  }, [enabled, userId]);

  const setStatus = useCallback((status: PresenceStatus) => {
    getSocketIO().emit("presence:status", status);
  }, []);

  const presenceOf = useCallback(
    (id: string): PresenceState =>
      presence[id] ?? { userId: id, status: "offline", lastActiveAt: 0 },
    [presence],
  );

  const dismissIncoming = useCallback(() => setIncomingCall(null), []);
  const setActive = useCallback((call: CallSummary | null) => setActiveCall(call), []);

  return {
    connected,
    presence,
    presenceOf,
    incomingCall,
    activeCall,
    setStatus,
    dismissIncoming,
    setActive,
  };
}
