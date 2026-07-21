"use client";
import { useEffect } from "react";
import { useNotificationStore } from "../stores/notification-store";

export function useTabTitle(baseTitle = "MyWorkspace") {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount > 99 ? "99+" : unreadCount}) ${baseTitle}` : baseTitle;
  }, [unreadCount, baseTitle]);
}
