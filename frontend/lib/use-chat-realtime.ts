"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/app/chat/chat-client";
import { getSocketIO } from "@/lib/socketio-client";

export interface TypingUser {
  userId: string;
  name: string;
}

interface ChatRealtimeOptions {
  enabled?: boolean;
  currentUserId?: string;
  onMessage?: (channelId: string, message: ChatMessage) => void;
  onMessageUpdated?: (channelId: string, message: ChatMessage) => void;
  onMessageDeleted?: (channelId: string, messageId: string) => void;
  onRead?: (channelId: string, readerId: string) => void;
  onDelivered?: (channelId: string, messageId: string, userId: string) => void;
}

const TYPING_TTL = 4_000;

/**
 * Socket-backed realtime chat signals. Keeps typing indicators fresh (they
 * expire after a short TTL), and relays message/create/update/delete + read +
 * delivery events. The chat data itself is owned by the Next.js API layer; the
 * socket only broadcasts signals that make the UI feel instant.
 */
export function useChatRealtime(options: ChatRealtimeOptions = {}) {
  const {
    enabled = true,
    currentUserId,
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
    onRead,
    onDelivered,
  } = options;
  const [typing, setTyping] = useState<Record<string, Record<string, TypingUser>>>({});
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Keep latest callbacks in a ref so the socket listeners can be registered
  // once while still reading fresh handlers.
  const callbackRef = useRef({
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
    onRead,
    onDelivered,
  });
  callbackRef.current = { onMessage, onMessageUpdated, onMessageDeleted, onRead, onDelivered };

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocketIO();

    const expireTyping = (channelId: string, userId: string) => {
      const key = `${channelId}:${userId}`;
      const timer = timersRef.current.get(key);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(key);
      }
      setTyping((prev) => {
        const channel = prev[channelId];
        if (!channel) return prev;
        const nextChannel = { ...channel };
        delete nextChannel[userId];
        return { ...prev, [channelId]: nextChannel };
      });
    };

    const onTyping = (data: { channelId?: string; userId?: string; name?: string }) => {
      const channelId = data?.channelId;
      const userId = data?.userId;
      if (!channelId || !userId || userId === currentUserId) return;
      const key = `${channelId}:${userId}`;
      const existing = timersRef.current.get(key);
      if (existing) clearTimeout(existing);
      setTyping((prev) => ({
        ...prev,
        [channelId]: {
          ...(prev[channelId] || {}),
          [userId]: { userId, name: data?.name || "" },
        },
      }));
      const timer = setTimeout(() => expireTyping(channelId, userId), TYPING_TTL);
      timersRef.current.set(key, timer);
    };

    const onStopTyping = (data: { channelId?: string; userId?: string }) => {
      if (!data?.channelId || !data?.userId) return;
      expireTyping(data.channelId, data.userId);
    };

    const onMessageEvent = (data: { channelId?: string; message?: ChatMessage }) => {
      if (data?.channelId && data?.message)
        callbackRef.current.onMessage?.(data.channelId, data.message);
    };
    const onMessageUpdatedEvent = (data: { channelId?: string; message?: ChatMessage }) => {
      if (data?.channelId && data?.message)
        callbackRef.current.onMessageUpdated?.(data.channelId, data.message);
    };
    const onMessageDeletedEvent = (data: { channelId?: string; messageId?: string }) => {
      if (data?.channelId && data?.messageId)
        callbackRef.current.onMessageDeleted?.(data.channelId, data.messageId);
    };
    const onReadEvent = (data: { channelId?: string; readerId?: string }) => {
      if (data?.channelId && data?.readerId)
        callbackRef.current.onRead?.(data.channelId, data.readerId);
    };
    const onDeliveredEvent = (data: {
      channelId?: string;
      messageId?: string;
      userId?: string;
    }) => {
      if (data?.channelId && data?.messageId && data?.userId) {
        callbackRef.current.onDelivered?.(data.channelId, data.messageId, data.userId);
      }
    };

    socket.on("chat:typing", onTyping);
    socket.on("chat:stop-typing", onStopTyping);
    socket.on("chat:message", onMessageEvent);
    socket.on("chat:message-updated", onMessageUpdatedEvent);
    socket.on("chat:message-deleted", onMessageDeletedEvent);
    socket.on("chat:read", onReadEvent);
    socket.on("chat:delivered", onDeliveredEvent);

    return () => {
      socket.off("chat:typing", onTyping);
      socket.off("chat:stop-typing", onStopTyping);
      socket.off("chat:message", onMessageEvent);
      socket.off("chat:message-updated", onMessageUpdatedEvent);
      socket.off("chat:message-deleted", onMessageDeletedEvent);
      socket.off("chat:read", onReadEvent);
      socket.off("chat:delivered", onDeliveredEvent);
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
    };
  }, [enabled, currentUserId]);

  const emitTyping = useCallback((channelId: string, typingNow: boolean, name = "") => {
    const socket = getSocketIO();
    if (typingNow) socket.emit("chat:typing", { channelId, name });
    else socket.emit("chat:stop-typing", { channelId });
  }, []);

  const emitRead = useCallback(
    (channelId: string) => {
      getSocketIO().emit("chat:read", { channelId, readerId: currentUserId });
    },
    [currentUserId],
  );

  const emitDelivered = useCallback((channelId: string, messageId: string) => {
    getSocketIO().emit("chat:delivered", { channelId, messageId });
  }, []);

  const emitMessage = useCallback((channelId: string, message: ChatMessage) => {
    getSocketIO().emit("chat:message", { channelId, message });
  }, []);

  const emitMessageUpdated = useCallback((channelId: string, message: ChatMessage) => {
    getSocketIO().emit("chat:message-updated", { channelId, message });
  }, []);

  const emitMessageDeleted = useCallback((channelId: string, messageId: string) => {
    getSocketIO().emit("chat:message-deleted", { channelId, messageId });
  }, []);

  const typingIn = useCallback(
    (channelId: string): TypingUser[] => {
      const channel = typing[channelId];
      if (!channel) return [];
      return Object.values(channel);
    },
    [typing],
  );

  return {
    typingIn,
    emitTyping,
    emitRead,
    emitDelivered,
    emitMessage,
    emitMessageUpdated,
    emitMessageDeleted,
  };
}
