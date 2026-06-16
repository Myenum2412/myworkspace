"use client";

import { useEffect, useState, useCallback } from "react";
import { getWsClient } from "@/lib/ws/client";
import { WsEventPayload } from "@/lib/ws/events";

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<WsEventPayload["notification"][]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const client = getWsClient();

    const unsub = client.on("notification", (data) => {
      const notif = data.payload as WsEventPayload["notification"];
      if (notif.userId === userId) {
        setNotifications((prev) => [notif, ...prev]);
        if (!notif.read) setUnreadCount((c) => c + 1);
      }
    });

    fetchNotifications(userId).then((data) => {
      setNotifications(data);
    });

    return () => { unsub(); };
  }, [userId]);

  const markAsRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await fetch("/api/notifications/read-all", { method: "POST", body: JSON.stringify({ userId }) });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}

async function fetchNotifications(userId: string) {
  try {
    const res = await fetch(`/api/notifications?userId=${userId}`);
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return [];
}
