"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export function useUserStatus(userId?: string) {
  const [status, setStatus] = useState<"online" | "offline" | "break" | string>("offline");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const fetchRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!userId) return;

    fetchRef.current?.abort();
    const controller = new AbortController();
    fetchRef.current = controller;

    fetch(`/api/user/status?userId=${userId}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setStatus((d.data?.status || d.status || "offline") as "online" | "offline" | "break");
      })
      .catch(() => {});

    return () => controller.abort();
  }, [userId]);

  const updateStatus = useCallback(async (newStatus: string) => {
    setStatus(newStatus);
    try {
      await fetch("/api/user/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch { /* ignore */ }
  }, []);

  return { status, updateStatus, onlineUsers };
}
