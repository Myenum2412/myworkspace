"use client";

import { useEffect, useState, useCallback } from "react";

export function useUserStatus(userId?: string) {
  const [status, setStatus] = useState<"online" | "offline" | "break" | string>("offline");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    fetchStatus(userId).then(setStatus);
  }, [userId]);

  const updateStatus = useCallback(async (newStatus: string) => {
    setStatus(newStatus);
    await fetch("/api/user/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    });
  }, []);

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
