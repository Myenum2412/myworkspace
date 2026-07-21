import { create } from "zustand";
import type { NotificationItem } from "@/hooks/use-notifications";

interface NotificationStore {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
  loading: boolean;
  hasMore: boolean;

  setNotifications: (notifications: NotificationItem[]) => void;
  addNotification: (notification: NotificationItem) => void;
  removeNotification: (id: string) => void;
  updateNotification: (id: string, updates: Partial<NotificationItem>) => void;
  setUnreadCount: (count: number) => void;
  setTotal: (total: number) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  decrementUnread: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  loading: false,
  hasMore: true,

  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) =>
    set((state) => {
      if (state.notifications.some((n) => n.id === notification.id)) return state;
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
        total: state.total + 1,
      };
    }),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      total: Math.max(0, state.total - 1),
    })),

  updateNotification: (id, updates) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),
  setTotal: (total) => set({ total }),
  setLoading: (loading) => set({ loading }),
  setHasMore: (hasMore) => set({ hasMore }),

  decrementUnread: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      total: 0,
      loading: false,
      hasMore: true,
    }),
}));
