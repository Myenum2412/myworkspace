"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckIcon,
  ChevronLeftIcon,
  HashIcon,
  PersonOffIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  Settings2Icon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from "@/lib/icons";

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
  return status === "online" || status === "active";
}

export default function ChatClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user?.id || "";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [view, setView] = useState<"channels" | "members">("channels");

  const [membersList, setMembersList] = useState<ChatMember[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"group" | "channel">("channel");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [manageId, setManageId] = useState<string | null>(null);

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
    if (selectedId) fetchMessages(selectedId);
  }, [selectedId, fetchMessages]);

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
    const interval = setInterval(fetchChannels, 15_000);
    return () => clearInterval(interval);
  }, [fetchChannels]);

  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || !selectedId) return;
    try {
      await fetch(`/api/chat/channels/${encodeURIComponent(selectedId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: chatInput.trim() }),
      });
      fetchMessages(selectedId);
    } catch {}
    setChatInput("");
  }, [chatInput, selectedId, fetchMessages]);

  const createChannel = useCallback(async () => {
    try {
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
  }, [createMode, newName, newDescription, selectedMemberIds, fetchChannels]);

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

  const sortedMembers = useMemo(
    () =>
      [...membersList].sort((a, b) => {
        const ao = isOnline(a.status) ? 1 : 0;
        const bo = isOnline(b.status) ? 1 : 0;
        if (ao !== bo) return bo - ao;
        return a.name.localeCompare(b.name);
      }),
    [membersList],
  );

  const onlineMembers = useMemo(
    () => sortedMembers.filter((m) => isOnline(m.status)),
    [sortedMembers],
  );
  const offlineMembers = useMemo(
    () => sortedMembers.filter((m) => !isOnline(m.status)),
    [sortedMembers],
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
    let list = messages.filter((m) => !m.deleted);
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

        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "channels" | "members")}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="border-b px-2 shrink-0">
            <TabsList className="h-9 w-full">
              <TabsTrigger value="channels" className="text-xs flex-1">
                <HashIcon className="size-3.5 mr-1" /> Channels
              </TabsTrigger>
              <TabsTrigger value="members" className="text-xs flex-1">
                <UsersIcon className="size-3.5 mr-1" /> Members
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="channels" className="flex-1 overflow-auto m-0 p-0">
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
                        {conv.lastMessage && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTime(conv.lastMessage.timestamp)}
                          </span>
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
                          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${isOnline(other?.status || "offline") ? "bg-green-500" : "bg-gray-400"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {other?.name || "Direct"}
                          </span>
                          {c.lastMessage && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatTime(c.lastMessage.timestamp)}
                            </span>
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
          </TabsContent>

          <TabsContent value="members" className="flex-1 overflow-auto m-0 p-0">
            {membersList.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <UsersIcon className="size-10 mb-3 opacity-30" />
                <p className="text-sm">No members found</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Online — {onlineMembers.length}
                  </p>
                </div>
                {onlineMembers.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => openDirect(m)}
                    className="flex w-full items-center gap-3 px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors border-b text-left"
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={m.avatar || undefined} />
                      <AvatarFallback className="text-xs">{getInitials(m.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {m.role}
                        {m.department ? ` · ${m.department}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
                <div className="px-4 py-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Offline — {offlineMembers.length}
                  </p>
                </div>
                {offlineMembers.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => openDirect(m)}
                    className="flex w-full items-center gap-3 px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors border-b text-left"
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={m.avatar || undefined} />
                      <AvatarFallback className="text-xs">{getInitials(m.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {m.role}
                        {m.department ? ` · ${m.department}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
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
              </div>
              <div className="flex items-center gap-1 shrink-0">
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

            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-3">
                {filteredMessages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground pt-8">
                    No messages yet. Say hi to{" "}
                    {selectedChannel.type === "dm"
                      ? selectedMember?.name || "them"
                      : selectedChannel.name}
                    !
                  </p>
                ) : (
                  filteredMessages.map((msg) => {
                    const isOwn = msg.senderId === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        {!isOwn && (
                          <Avatar className="size-8 shrink-0">
                            <AvatarImage src={msg.senderAvatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {msg.senderName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                          {!isOwn && (
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">
                              {msg.senderName}
                            </p>
                          )}
                          <div
                            className={`rounded-sm px-3 py-2 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                          >
                            {msg.type === "system" ? (
                              <p className="text-xs text-muted-foreground italic text-center">
                                {msg.text}
                              </p>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {msg.edited && (
                              <span className="text-[10px] text-muted-foreground">(edited)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="px-4 py-3 border-t shrink-0">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={`Message ${selectedMember?.name || `#${selectedChannel.name || "channel"}`}`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
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
              <Button onClick={createChannel} disabled={!newName.trim()}>
                Create {createMode}
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
    </div>
  );
}
