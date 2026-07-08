"use client";

import { useEffect, useState, useCallback } from "react";
import { getWsClient } from "@/lib/ws/client";
import { WsEventPayload } from "@/lib/ws/events";

export function useUserStatus(userId?: string) {
  const [status, setStatus] = useState<"online" | "offline" | "break" | string>("offline");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const client = getWsClient();
    const unsub = client.on("user:status", (data: unknown) => {
      const payload = data as WsEventPayload["user:status"];
      if (payload.userId === userId) {
        setStatus(payload.status);
      }
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (payload.status === "offline") {
          next.delete(payload.userId);
        } else {
          next.add(payload.userId);
        }
        return next;
      });
    });

    fetchStatus(userId).then(setStatus);
    return () => { unsub(); };
  }, [userId]);

  const updateStatus = useCallback(async (newStatus: string) => {
    const client = getWsClient();
    client.send({
      type: "status_update",
      payload: { userId, status: newStatus },
    });
    setStatus(newStatus);
    await fetch("/api/user/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    });
  }, [userId]);

  return { status, updateStatus, onlineUsers };
}

async function fetchStatus(userId: string) {
  try {
    const res = await fetch(`/api/user/status?userId=${userId}`, { credentials: "include" });
    if (res.ok) {
      const d = await res.json();
      return (d.data?.status || d.status || "offline") as "online" | "offline" | "break";
    }
  } catch { /* ignore */ }
  return "offline";
}
