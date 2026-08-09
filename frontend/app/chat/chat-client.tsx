"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import CallRoom from "@/components/call/call-room";
import CallScheduler from "@/components/call/call-scheduler";
import IncomingCallCard from "@/components/call/incoming-call";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChatBubble,
  type MessageStatus,
  type Reaction,
} from "@/components/ui/whatsapp/chat-bubble";
import { apiCreateCall } from "@/lib/call-api";
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  HashIcon,
  PencilIcon,
  PersonOffIcon,
  PhoneIcon,
  PlusIcon,
  ReplyIcon,
  SearchIcon,
  SendIcon,
  Settings2Icon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
  VideoIcon,
} from "@/lib/icons";
import { useChatRealtime } from "@/lib/use-chat-realtime";
import { useRealtime } from "@/lib/use-realtime";

export interface ChatMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string;
  designation: string;
  phone: string;
  avatar: string;
}

export interface ChatChannel {
  id: string;
  type: "dm" | "group" | "channel";
  name: string;
  description: string;
  icon: string;
  members: string[];
  allMembers: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string;
  } | null;
  messageCount: number;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: string;
  replyTo: string | null;
  reactions: { emoji: string; userId: string }[];
  readBy: string[];
  edited: boolean;
  deleted: boolean;
  pinned: boolean;
  attachments: unknown[];
  createdAt: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function isOnline(status: string) {
  return status === "online" || status === "active" || status === "in-call";
}

function presenceDotClass(status: string) {
  switch (status) {
    case "online":
    case "active":
      return "bg-green-500";
    case "in-call":
      return "bg-emerald-400";
    case "idle":
      return "bg-amber-400";
    case "busy":
      return "bg-red-400";
    default:
      return "bg-gray-400";
  }
}

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  if (isSameDay(dateStr, now.toISOString())) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(dateStr, yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

const SENDER_COLORS = [
  "var(--wa-emerald-500)",
  "var(--wa-cobalt-400)",
  "var(--wa-purple-400)",
  "var(--wa-pink-300)",
  "var(--wa-orange-300)",
  "var(--wa-teal-400)",
  "var(--wa-red-300)",
  "var(--wa-yellow-300)",
];

function senderColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deriveMessageStatus(
  msg: ChatMessage,
  userId: string,
  isLast: boolean,
): MessageStatus | undefined {
  if (msg.senderId !== userId) return undefined;
  if (msg.readBy.length > 0) return "read";
  if (msg.deleted) return undefined;
  if (isLast) return "sent";
  return "delivered";
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function typingLabel(users: { userId: string; name: string }[], _channelId: string | null) {
  void _channelId;
  const names = users.map((u) => u.name || "Someone");
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names[0]} and ${names.length - 1} others are typing…`;
}

export default function ChatClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user?.id || "";

  const realtime = useRealtime({ session, enabled: status === "authenticated" });
  const { presenceOf, incomingCall, activeCall, setActive, dismissIncoming } = realtime;

  const chatRealtime = useChatRealtime({
    enabled: status === "authenticated",
    currentUserId: userId,
    onMessage: (channelId, message) => {
      setMessages((prev) =>
        channelId === selectedId
          ? prev.some((m) => m.id === message.id)
            ? prev
            : [...prev, message]
          : prev,
      );
      if (channelId === selectedId && message.senderId !== userId) {
        chatRealtimeRef.current?.emitDelivered?.(channelId, message.id);
        markRead();
        fetchChannels();
      }
    },
    onMessageUpdated: (channelId, message) => {
      if (channelId !== selectedId) return;
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    },
    onMessageDeleted: (channelId, messageId) => {
      if (channelId !== selectedId) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, deleted: true } : m)));
    },
    onRead: (channelId, readerId) => {
      if (channelId !== selectedId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === userId && !m.readBy.includes(readerId)
            ? { ...m, readBy: [...m.readBy, readerId] }
            : m,
        ),
      );
    },
  });
  const { typingIn, emitTyping, emitRead, emitMessage, emitMessageUpdated, emitMessageDeleted } =
    chatRealtime;
  // ref so socket event handlers always call the latest closures
  const chatRealtimeRef = useRef<ReturnType<typeof useChatRealtime> | null>(null);
  chatRealtimeRef.current = chatRealtime;

  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [callMode, setCallMode] = useState<"video" | "audio">("video");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const [membersList, setMembersList] = useState<ChatMember[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"dm" | "group" | "channel">("channel");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [manageId, setManageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/members");
      const json = await res.json();
      setMembersList(json.members || []);
    } catch {}
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/channels");
      const json = await res.json();
      setChannels(json.channels || []);
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/chat/channels/${encodeURIComponent(channelId)}/messages`);
      const json = await res.json();
      setMessages(json.messages || []);
    } catch {
      setMessages([]);
    }
  }, []);

  const markRead = useCallback(async () => {
    if (!selectedId) return;
    try {
      await fetch(`/api/chat/channels/${encodeURIComponent(selectedId)}/read`, {
        method: "POST",
      });
      setChannels((prev) => prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)));
      emitRead(selectedId);
    } catch {}
  }, [selectedId, emitRead]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([fetchMembers(), fetchChannels()]).finally(() => setLoading(false));
  }, [status, fetchMembers, fetchChannels]);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      markRead();
    }
  }, [selectedId, fetchMessages, markRead]);

  useEffect(() => {
    if (messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => fetchMessages(selectedId), 8_000);
    return () => clearInterval(interval);
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(markRead, 30_000);
    return () => clearInterval(interval);
  }, [selectedId, markRead]);

  useEffect(() => {
    const interval = setInterval(fetchChannels, 15_000);
    return () => clearInterval(interval);
  }, [fetchChannels]);

  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || !selectedId) return;
    if (editingId) {
      try {
        await fetch(
          `/api/chat/channels/${encodeURIComponent(selectedId)}/messages/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: chatInput.trim() }),
          },
        );
        const updated = messages.find((m) => m.id === editingId);
        if (updated) {
          emitMessageUpdated(selectedId, { ...updated, text: chatInput.trim(), edited: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === editingId ? { ...m, text: chatInput.trim(), edited: true } : m,
            ),
          );
        }
        fetchMessages(selectedId);
        setEditingId(null);
        setReplyingTo(null);
      } catch {}
      emitTyping(selectedId, false);
      setChatInput("");
      return;
    }
    try {
      const res = await fetch(`/api/chat/channels/${encodeURIComponent(selectedId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: chatInput.trim(),
          ...(replyingTo ? { replyTo: replyingTo.id } : {}),
        }),
      });
      const json = await res.json();
      if (json.data?.message) {
        const message: ChatMessage = {
          id: json.data.message.id,
          conversationId: selectedId,
          senderId: userId,
          senderName: session?.user?.name || "You",
          senderAvatar: session?.user?.image || "",
          text: json.data.message.content,
          type: "text",
          replyTo: replyingTo?.id ?? null,
          reactions: [],
          readBy: [],
          edited: false,
          deleted: false,
          pinned: false,
          attachments: [],
          createdAt: json.data.message.createdAt,
        };
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
        emitMessage(selectedId, message);
      }
      fetchMessages(selectedId);
      setReplyingTo(null);
    } catch {}
    emitTyping(selectedId, false);
    setChatInput("");
  }, [
    chatInput,
    selectedId,
    fetchMessages,
    replyingTo,
    editingId,
    messages,
    userId,
    session?.user?.name,
    session?.user?.image,
    emitMessage,
    emitMessageUpdated,
    emitTyping,
  ]);

  const openDirect = useCallback(
    async (member: ChatMember) => {
      const existing = channels.find(
        (c) => c.type === "dm" && c.allMembers.includes(userId) && c.allMembers.includes(member.id),
      );
      if (existing) {
        setSelectedId(existing.id);
        setShowMobileChat(true);
        return;
      }
      try {
        const res = await fetch("/api/chat/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "dm", members: [member.id] }),
        });
        const json = await res.json();
        if (json.data?.channel) {
          setSelectedId(json.data.channel.id);
          setShowMobileChat(true);
          fetchChannels();
        }
      } catch {}
    },
    [channels, userId, fetchChannels],
  );

  const createChannel = useCallback(async () => {
    try {
      if (createMode === "dm") {
        const member = membersList.find((m) => selectedMemberIds.includes(m.id));
        if (member) {
          await openDirect(member);
          setCreateOpen(false);
          setNewName("");
          setNewDescription("");
          setSelectedMemberIds([]);
          return;
        }
        return;
      }
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: createMode,
          name: newName.trim(),
          description: newDescription.trim(),
          members: selectedMemberIds,
        }),
      });
      const json = await res.json();
      if (json.data?.channel) {
        setSelectedId(json.data.channel.id);
        setShowMobileChat(true);
      }
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setSelectedMemberIds([]);
      fetchChannels();
    } catch {}
  }, [
    createMode,
    newName,
    newDescription,
    selectedMemberIds,
    fetchChannels,
    membersList,
    openDirect,
  ]);

  const startCall = useCallback(
    async (media: "video" | "audio") => {
      const channel = channels.find((c) => c.id === selectedId);
      if (!selectedId || !channel) return;
      setCallMode(media);
      try {
        const { data } = await apiCreateCall({
          channelId: channel.id,
          type: (channel.type === "dm" ? "dm" : channel.type) as "dm" | "group" | "channel",
          name: channel.name,
          media,
          invitees:
            channel.type === "dm" ? (channel.allMembers || []).filter((id) => id !== userId) : [],
        });
        setActive({
          id: data.id,
          orgId: session?.user?.orgId || "",
          type: data.type,
          media,
          status: "active",
          initiatorId: userId,
          participants: [],
          invitees: [],
          maxParticipants: data.maxParticipants,
          createdAt: new Date().toISOString(),
          name: channel.name || "",
          recording: false,
          mutedAll: false,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start call");
      }
    },
    [selectedId, channels, userId, session?.user?.orgId, setActive],
  );

  const removeMember = useCallback(
    async (channelId: string, targetId: string) => {
      try {
        await fetch(
          `/api/chat/channels/${encodeURIComponent(channelId)}/members?userId=${encodeURIComponent(targetId)}`,
          { method: "DELETE" },
        );
        fetchChannels();
      } catch {}
    },
    [fetchChannels],
  );

  const deleteChannel = useCallback(
    async (channelId: string) => {
      try {
        await fetch(`/api/chat/channels/${encodeURIComponent(channelId)}`, {
          method: "DELETE",
        });
        if (selectedId === channelId) {
          setSelectedId(null);
          setMessages([]);
          setShowMobileChat(false);
        }
        fetchChannels();
      } catch {}
    },
    [selectedId, fetchChannels],
  );

  const addSelectedMembers = useCallback(
    async (channelId: string) => {
      try {
        await fetch(`/api/chat/channels/${encodeURIComponent(channelId)}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ members: selectedMemberIds }),
        });
        setSelectedMemberIds([]);
        fetchChannels();
      } catch {}
    },
    [selectedMemberIds, fetchChannels],
  );

  const toggleMemberSelection = useCallback((id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!selectedId) return;
      try {
        const res = await fetch(
          `/api/chat/channels/${encodeURIComponent(selectedId)}/messages/${encodeURIComponent(messageId)}/reactions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
          },
        );
        const json = await res.json();
        if (json.data?.reactions) {
          const next = json.data.reactions as { emoji: string; userId: string }[];
          const target = messages.find((m) => m.id === messageId);
          if (target) emitMessageUpdated(selectedId, { ...target, reactions: next });
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, reactions: next } : m)),
          );
        }
      } catch {}
    },
    [selectedId, messages, emitMessageUpdated],
  );

  const startEdit = useCallback((message: ChatMessage) => {
    setEditingId(message.id);
    setChatInput(message.text);
    setReplyingTo(null);
  }, []);

  const startReply = useCallback((message: ChatMessage) => {
    setReplyingTo(message);
    setEditingId(null);
  }, []);

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!selectedId) return;
      try {
        await fetch(
          `/api/chat/channels/${encodeURIComponent(selectedId)}/messages/${encodeURIComponent(messageId)}`,
          { method: "DELETE" },
        );
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, deleted: true } : m)));
        emitMessageDeleted(selectedId, messageId);
      } catch {}
    },
    [selectedId, emitMessageDeleted],
  );

  const filteredChannels = useMemo(() => {
    let list = channels;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.lastMessage?.text?.toLowerCase().includes(q),
      );
    }
    return [...list].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    );
  }, [channels, searchQuery]);

  const dms = useMemo(() => filteredChannels.filter((c) => c.type === "dm"), [filteredChannels]);
  const groups = useMemo(
    () => filteredChannels.filter((c) => c.type === "group" || c.type === "channel"),
    [filteredChannels],
  );

  const memberPresenceStatus = useCallback(
    (memberId: string, fallback: string) => {
      const live = presenceOf(memberId)?.status;
      if (live && live !== "offline") return live;
      return fallback;
    },
    [presenceOf],
  );

  const sortedMembers = useMemo(
    () =>
      [...membersList].sort((a, b) => {
        const ao = isOnline(memberPresenceStatus(a.id, a.status)) ? 1 : 0;
        const bo = isOnline(memberPresenceStatus(b.id, b.status)) ? 1 : 0;
        if (ao !== bo) return bo - ao;
        return a.name.localeCompare(b.name);
      }),
    [membersList, memberPresenceStatus],
  );

  const selectedChannel = channels.find((c) => c.id === selectedId);
  const selectedMember = selectedChannel
    ? membersList.find(
        (m) =>
          selectedChannel.type === "dm" &&
          selectedChannel.allMembers.includes(m.id) &&
          m.id !== userId,
      )
    : undefined;

  const filteredMessages = useMemo(() => {
    let list = messages;
    if (msgSearch) {
      const q = msgSearch.toLowerCase();
      list = list.filter(
        (m) => m.text.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [messages, msgSearch]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }
  if (!session?.user) return null;

  const memberCount =
    selectedChannel?.type === "dm" ? 2 : (selectedChannel?.allMembers?.length ?? 0);
  const manageTarget = manageId ? channels.find((c) => c.id === manageId) : undefined;
  const targetMembers = manageTarget
    ? membersList.filter((m) => manageTarget.allMembers.includes(m.id))
    : [];
  const availableMembers = manageTarget
    ? membersList.filter((m) => !manageTarget.allMembers.includes(m.id))
    : [];

  return (
    <div className="flex flex-1 h-full overflow-hidden -m-2 sm:-m-3 md:-m-4 lg:-m-6 -mt-2 sm:-mt-3 md:-mt-4 lg:-mt-6 pb-16 sm:pb-0">
      {/* ── LEFT PANEL: Channels / Members ─────────────────── */}
      <div
        className={`w-full md:w-72 lg:w-80 border-r flex flex-col bg-background ${showMobileChat ? "hidden md:flex" : "flex"}`}
      >
        <div className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold">Chat</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCreateOpen(true)}
              aria-label="New channel"
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search chats and members"
              className="pl-9 h-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* Channels only (no separate Members tab) */}
            {groups.length === 0 && dms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <HashIcon className="size-10 mb-3 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a channel, group, or message a member
                </p>
              </div>
            ) : (
              <>
                {groups.length > 0 && (
                  <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Channels & Groups ({groups.length})
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => {
                        setCreateMode("channel");
                        setCreateOpen(true);
                      }}
                      aria-label="New channel"
                    >
                      <PlusIcon className="size-3.5" />
                    </Button>
                  </div>
                )}
                {groups.map((conv) => (
                  <button
                    type="button"
                    key={conv.id}
                    onClick={() => {
                      setSelectedId(conv.id);
                      setShowMobileChat(true);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors border-b text-left ${selectedId === conv.id ? "bg-muted" : ""}`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-9">
                        <AvatarImage src={conv.icon || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10">
                          <HashIcon className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{conv.name}</span>
                        {conv.unreadCount > 0 ? (
                          <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-wa-primary text-[10px] font-semibold text-white">
                            {conv.unreadCount}
                          </span>
                        ) : (
                          conv.lastMessage && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatTime(conv.lastMessage.timestamp)}
                            </span>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="badge text-[10px] text-muted-foreground shrink-0">
                          {conv.type === "channel" ? "#" : "👥"}
                        </span>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage?.senderId === userId
                            ? `You: ${conv.lastMessage?.text}`
                            : conv.lastMessage?.text || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {dms.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Direct Messages ({dms.length})
                    </p>
                  </div>
                )}
                {dms.map((c) => {
                  const otherId = c.allMembers.find((id) => id !== userId);
                  const other = membersList.find((m) => m.id === otherId);
                  const otherStatus = memberPresenceStatus(
                    otherId || other?.id || "",
                    other?.status || "offline",
                  );
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setSelectedId(c.id);
                        setShowMobileChat(true);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors border-b text-left ${selectedId === c.id ? "bg-muted" : ""}`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-9">
                          <AvatarImage src={other?.avatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(other?.name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${presenceDotClass(otherStatus)}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {other?.name || "Direct"}
                          </span>
                          {c.unreadCount > 0 ? (
                            <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-wa-primary text-[10px] font-semibold text-white">
                              {c.unreadCount}
                            </span>
                          ) : (
                            c.lastMessage && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatTime(c.lastMessage.timestamp)}
                              </span>
                            )
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.lastMessage?.senderId === userId
                            ? `You: ${c.lastMessage?.text}`
                            : c.lastMessage?.text || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Chat ───────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${!showMobileChat ? "hidden md:flex" : "flex"}`}
      >
        {selectedId && selectedChannel ? (
          <>
            <div className="flex items-center gap-3 px-4 py-2 border-b shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setShowMobileChat(false)}
                aria-label="Back"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Avatar className="size-9">
                <AvatarImage src={selectedMember?.avatar || selectedChannel.icon || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedMember?.name || selectedChannel.name || "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate">
                  {selectedMember?.name || selectedChannel.name}
                </h2>
                {selectedMember ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedMember.role}
                    {selectedMember.designation ? ` · ${selectedMember.designation}` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {memberCount} member{memberCount === 1 ? "" : "s"}
                  </p>
                )}
                {typingIn(selectedId).length > 0 && (
                  <p className="text-xs text-emerald-600 font-medium">
                    {typingLabel(typingIn(selectedId), selectedId)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Start a call"
                      title="Call"
                      className="text-emerald-600"
                    >
                      <PhoneIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void startCall("video")}>
                      <VideoIcon className="size-4 mr-2" /> Video call
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void startCall("audio")}>
                      <PhoneIcon className="size-4 mr-2" /> Audio call
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSchedulerOpen(true)}>
                      <CalendarIcon className="size-4 mr-2" /> Schedule
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMsgSearch(!showMsgSearch)}
                  aria-label="Search messages"
                >
                  <SearchIcon className="size-4" />
                </Button>
                {selectedChannel.type !== "dm" && selectedChannel.createdBy === userId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setManageId(selectedChannel.id)}
                    aria-label="Manage channel"
                  >
                    <Settings2Icon className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {showMsgSearch && (
              <div className="px-4 py-2 border-b shrink-0">
                <Input
                  placeholder="Search in this channel"
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  className="h-8 bg-white"
                />
              </div>
            )}

            <ScrollArea className="flex-1 bg-[var(--wa-conversation-bg)]">
              <div className="px-3 sm:px-4 py-3 min-h-full">
                {filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-sm text-wa-text-secondary pt-16">
                    <div className="text-5xl mb-3">
                      {selectedChannel.type === "dm" ? "👋" : "💬"}
                    </div>
                    <p>
                      No messages yet. Say hi to{" "}
                      {selectedChannel.type === "dm"
                        ? selectedMember?.name || "them"
                        : selectedChannel.name}
                      !
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {filteredMessages.map((msg, idx) => {
                      const isOwn = msg.senderId === userId;
                      const prev = filteredMessages[idx - 1];
                      const next = filteredMessages[idx + 1];
                      const showDay = !prev || !isSameDay(prev.createdAt, msg.createdAt);
                      const sameGroupNext =
                        next &&
                        next.senderId === msg.senderId &&
                        isSameDay(next.createdAt, msg.createdAt);

                      const reactions = msg.reactions.reduce<Reaction[]>((acc, r) => {
                        const found = acc.find((a) => a.emoji === r.emoji);
                        if (found) {
                          found.count = (found.count || 0) + 1;
                          if (r.userId === userId) found.reacted = true;
                        } else {
                          acc.push({
                            emoji: r.emoji,
                            count: 1,
                            reacted: r.userId === userId,
                          });
                        }
                        return acc;
                      }, []);

                      const status = deriveMessageStatus(
                        msg,
                        userId,
                        filteredMessages.findLastIndex(
                          (m) => m.senderId === userId && !m.deleted,
                        ) === idx,
                      );

                      const replyMsg = msg.replyTo
                        ? filteredMessages.find((m) => m.id === msg.replyTo)
                        : undefined;

                      return (
                        <div key={msg.id} className="group relative">
                          {showDay && (
                            <div className="my-3 flex justify-center">
                              <span className="rounded-full bg-[#ffffff]/90 px-3 py-1 text-[11px] font-medium text-[#575869] shadow-sm dark:bg-[#182229]/95 dark:text-[#e9edef]">
                                {dayLabel(msg.createdAt)}
                              </span>
                            </div>
                          )}
                          <ChatBubble
                            variant={isOwn ? "outgoing" : "incoming"}
                            timestamp={
                              msg.deleted
                                ? formatMessageTime(msg.createdAt)
                                : `${formatMessageTime(msg.createdAt)}${msg.edited ? " (edited)" : ""}`
                            }
                            status={msg.deleted ? undefined : status}
                            sender={isOwn ? undefined : msg.senderName}
                            showTail={!sameGroupNext}
                            isGroupChat={selectedChannel.type !== "dm"}
                            senderColor={senderColor(msg.senderName || "")}
                            reactions={reactions}
                            className="relative z-0"
                          >
                            {msg.deleted ? (
                              <em className="text-wa-text-secondary">This message was deleted</em>
                            ) : (
                              <>
                                {replyMsg && (
                                  <div className="mb-1 overflow-hidden rounded-sm border-l-2 border-wa-emerald-500 bg-white/40 px-2 py-1 dark:bg-black/20">
                                    <p className="truncate text-[11px] font-medium text-wa-text-secondary">
                                      {replyMsg.senderId === userId ? "You" : replyMsg.senderName}
                                    </p>
                                    <p className="truncate text-[12px] text-wa-text-primary">
                                      {replyMsg.deleted
                                        ? "This message was deleted"
                                        : replyMsg.text}
                                    </p>
                                  </div>
                                )}
                                {msg.type === "system" ? (
                                  <span className="text-xs italic text-wa-text-secondary">
                                    {msg.text}
                                  </span>
                                ) : (
                                  <span className="whitespace-pre-wrap break-words">
                                    {msg.text}
                                  </span>
                                )}
                              </>
                            )}
                          </ChatBubble>

                          {!msg.deleted && (
                            <div
                              className={`absolute -top-2 z-20 hidden items-center gap-0.5 rounded-full border border-wa-border bg-wa-bg px-1 py-0.5 shadow-md group-hover:flex ${
                                isOwn ? "-left-1" : "-right-1"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => startReply(msg)}
                                className="rounded-full p-1 text-wa-icon-default hover:bg-wa-hover"
                                aria-label="Reply"
                                title="Reply"
                              >
                                <ReplyIcon className="size-3.5" />
                              </button>
                              <div className="flex items-center gap-0.5 px-0.5">
                                {QUICK_REACTIONS.map((e) => (
                                  <button
                                    type="button"
                                    key={e}
                                    onClick={() => toggleReaction(msg.id, e)}
                                    className="rounded-full p-0.5 text-[13px] leading-none hover:bg-wa-hover"
                                    aria-label={`React ${e}`}
                                    title={`React ${e}`}
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                              {isOwn && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(msg)}
                                    className="rounded-full p-1.5 text-wa-icon-default hover:bg-wa-hover"
                                    aria-label="Edit message"
                                    title="Edit message"
                                  >
                                    <PencilIcon className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteMessage(msg.id)}
                                    className="rounded-full p-1.5 text-wa-icon-default hover:bg-wa-hover"
                                    aria-label="Delete message"
                                    title="Delete message"
                                  >
                                    <Trash2Icon className="size-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="px-4 py-3 border-t shrink-0 bg-background">
              {replyingTo && (
                <div className="mb-2 flex items-center gap-2 rounded-sm border-l-2 border-wa-primary bg-muted px-3 py-1.5">
                  <ReplyIcon className="size-3.5 shrink-0 text-wa-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-wa-primary">
                      Replying to{" "}
                      {replyingTo.senderId === userId ? "yourself" : replyingTo.senderName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {replyingTo.deleted ? "This message was deleted" : replyingTo.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    aria-label="Cancel reply"
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              )}
              {editingId && (
                <div className="mb-2 flex items-center gap-2 rounded-sm border-l-2 border-primary bg-muted px-3 py-1.5">
                  <PencilIcon className="size-3.5 shrink-0 text-primary" />
                  <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    Editing message
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setChatInput("");
                    }}
                    aria-label="Cancel edit"
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <Input
                  placeholder={
                    editingId
                      ? "Editing message…"
                      : `Message ${selectedMember?.name || `#${selectedChannel.name || "channel"}`}`
                  }
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    if (selectedId) {
                      if (e.target.value.trim()) {
                        emitTyping(selectedId, true, session?.user?.name || "Someone");
                      } else {
                        emitTyping(selectedId, false);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  className="shrink-0"
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  aria-label="Send message"
                >
                  <SendIcon className="size-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <HashIcon className="size-16 mb-4 opacity-20" />
            <h2 className="text-xl font-semibold mb-1 text-foreground">Welcome to Chat</h2>
            <p className="text-sm mb-4">Pick a conversation or create a new channel</p>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="mr-2" /> New Channel
            </Button>
          </div>
        )}
      </div>

      {/* ── Create Channel / Group Dialog ───────────────────── */}
      {createOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: dialog backdrop
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="presentation"
          onClick={() => setCreateOpen(false)}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: dialog container */}
          <div
            className="bg-background rounded-sm shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto m-4"
            role="presentation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create {createMode}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreateOpen(false)}
                aria-label="Close"
              >
                ✕
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={createMode === "channel" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setCreateMode("channel")}
                >
                  <HashIcon className="size-3.5 mr-1" /> Channel
                </Button>
                <Button
                  variant={createMode === "group" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setCreateMode("group")}
                >
                  <UsersIcon className="size-3.5 mr-1" /> Group
                </Button>
                <Button
                  variant={createMode === "dm" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setCreateMode("dm")}
                >
                  <PersonOffIcon className="size-3.5 mr-1" /> Direct
                </Button>
              </div>
              <div>
                <label htmlFor="chat-new-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="chat-new-name"
                  placeholder={createMode === "channel" ? "e.g. general" : "e.g. Design Team"}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="chat-new-desc" className="text-sm font-medium">
                  Description (optional)
                </label>
                <Input
                  id="chat-new-desc"
                  placeholder="What is this about?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="chat-new-members" className="text-sm font-medium">
                  Add members
                </label>
                <ScrollArea id="chat-new-members" className="h-44 mt-1 border rounded-sm">
                  {sortedMembers.map((m) => {
                    const checked = selectedMemberIds.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMemberSelection(m.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-left"
                      >
                        <div
                          className={`size-4 rounded-sm border flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-muted-foreground/40"}`}
                        >
                          {checked && <CheckIcon className="size-3 text-white" />}
                        </div>
                        <Avatar className="size-6">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{m.name}</span>
                        <span className="text-[11px] text-muted-foreground ml-auto truncate">
                          {m.role}
                        </span>
                      </button>
                    );
                  })}
                </ScrollArea>
              </div>
              <Button onClick={createChannel} disabled={!newName.trim() && createMode !== "dm"}>
                Create {createMode === "dm" ? "direct message" : createMode}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Members Dialog ───────────────────────────── */}
      {manageTarget && (
        // biome-ignore lint/a11y/noStaticElementInteractions: dialog backdrop
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="presentation"
          onClick={() => setManageId(null)}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: dialog container */}
          <div
            className="bg-background rounded-sm shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto m-4"
            role="presentation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Manage {manageTarget.name}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManageId(null)}
                aria-label="Close"
              >
                ✕
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Members ({targetMembers.length})
                </p>
                {targetMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                ) : (
                  targetMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 py-1.5">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{m.name}</span>
                      {manageTarget.createdBy === m.id && (
                        <Badge variant="outline" className="text-[10px]">
                          Creator
                        </Badge>
                      )}
                      {m.id !== userId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 ml-auto"
                          onClick={() => removeMember(manageTarget.id, m.id)}
                          aria-label={`Remove ${m.name}`}
                        >
                          <PersonOffIcon className="size-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
              {availableMembers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Add members
                  </p>
                  {availableMembers.map((m) => {
                    const checked = selectedMemberIds.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMemberSelection(m.id)}
                        className="flex w-full items-center gap-2 px-1 py-1.5 cursor-pointer hover:bg-muted/50 rounded-sm text-left"
                      >
                        <div
                          className={`size-4 rounded-sm border flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-muted-foreground/40"}`}
                        >
                          {checked && <CheckIcon className="size-3 text-white" />}
                        </div>
                        <Avatar className="size-6">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => addSelectedMembers(manageTarget.id)}
                  disabled={selectedMemberIds.length === 0}
                >
                  <UserPlusIcon className="size-4 mr-1" /> Add selected
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteChannel(manageTarget.id);
                    setManageId(null);
                  }}
                >
                  <Trash2Icon className="size-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Call orchestration ─────────────────────────────── */}
      <CallScheduler
        open={schedulerOpen}
        onOpenChange={setSchedulerOpen}
        channelId={selectedChannel?.id}
        type={selectedChannel?.type === "dm" ? "dm" : "channel"}
        channelName={selectedChannel?.name}
        media={callMode === "audio" ? "audio" : "video"}
        members={membersList.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          avatar: m.avatar,
        }))}
        currentUserId={userId}
        onJoined={(callId) => {
          setActive({
            id: callId,
            orgId: session.user?.orgId || "",
            type: (selectedChannel?.type === "dm" ? "dm" : "channel") as "dm" | "group" | "channel",
            status: "active",
            initiatorId: userId,
            participants: [],
            invitees: [],
            maxParticipants: 10,
            createdAt: new Date().toISOString(),
            name: selectedChannel?.name || "",
            recording: false,
            mutedAll: false,
          });
        }}
      />

      {activeCall && activeCall.participants?.length >= 0 && (
        <CallRoom
          call={activeCall}
          currentUserId={userId}
          isModerator={
            activeCall.initiatorId === userId ||
            session.user?.role === "org_admin" ||
            session.user?.role === "manager"
          }
          onLeave={() => setActive(null)}
          onClosed={() => setActive(null)}
        />
      )}

      {incomingCall && !activeCall && (
        <IncomingCallCard
          incoming={incomingCall}
          onClose={dismissIncoming}
          onJoin={() => {
            setActive(incomingCall.call);
          }}
        />
      )}
    </div>
  );
}
