"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { chatPageJsonLd } from "@/lib/seo/seo-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquareIcon, PhoneIcon, VideoIcon, UsersIcon, BellIcon,
  SearchIcon, SendIcon, PlusIcon, MoreVerticalIcon, PinIcon, ArchiveIcon,
  Trash2Icon, ReplyIcon, SmileIcon, PaperclipIcon, ImageIcon,
  MicIcon, MicOffIcon, VideoOffIcon, ScreenShareIcon, ScreenShareOffIcon,
  HandIcon, PhoneOffIcon, LogInIcon, CheckCheckIcon, CheckIcon,
  XCircleIcon, ChevronLeftIcon, StarIcon, CopyIcon, ForwardIcon,
  DownloadIcon, UserIcon, Building2Icon, ClockIcon, MailIcon,
  PhoneCallIcon, InfoIcon,
} from "lucide-react";
import ChatIcon from '@mui/icons-material/Chat';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════
interface Contact {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department: string;
  company: string;
  phone: string;
  status: string;
  presence: { status: string; lastSeen: string | null };
  type: "employee" | "client";
}

interface Conversation {
  _id: string;
  id: string;
  type: "direct" | "group";
  name: string;
  avatar: string;
  participants: string[];
  lastMessage: { text: string; senderId: string; senderName: string; timestamp: string } | null;
  pinnedBy: string[];
  archivedBy: string[];
  unreadCount: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  _id: string;
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
  attachments: { name: string; url: string; type: string; size: number }[];
  createdAt: string;
}

interface Meeting {
  _id: string;
  id: string;
  roomId: string;
  title: string;
  isActive: boolean;
  participants: string[];
  createdAt: string;
}

interface Participant {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
}

interface Notification {
  _id: string;
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatLastSeen(dateStr: string | null) {
  if (!dateStr) return "Offline";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Active now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function ChatPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "";
  const userName = session?.user?.name || "User";
  const userAvatar = session?.user?.image || "";

  // ── Navigation ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"chats" | "contacts" | "notifications">("chats");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // ── Data ─────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Chat State ───────────────────────────────────────────────
  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [msgSearch, setMsgSearch] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);

  // ── Modals ───────────────────────────────────────────────────
  const [createConvOpen, setCreateConvOpen] = useState(false);
  const [newConvName, setNewConvName] = useState("");
  const [newConvParticipant, setNewConvParticipant] = useState("");

  // ── Refs ─────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // FETCH DATA (REST)
  // ═══════════════════════════════════════════════════════════════════════
  const fetchContacts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/contacts?userId=${userId}`);
      const data = await res.json();
      setContacts(data.data || []);
    } catch { setContacts([]); }
    setLoading(false);
  }, [userId]);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API}/api/conversations?userId=${userId}`);
      const data = await res.json();
      setConversations(data.data || []);
    } catch {}
  }, [userId]);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`${API}/api/conversations/${convId}/messages`);
      const data = await res.json();
      setMessages(data.data || []);
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API}/api/notifications/${userId}`);
      const data = await res.json();
      setNotifications(data.data || []);
    } catch {}
  }, [userId]);

  useEffect(() => { fetchContacts(); fetchConversations(); fetchNotifications(); }, [fetchContacts, fetchConversations, fetchNotifications]);

  // Refresh messages when conversation selected
  useEffect(() => {
    if (selectedConvId) fetchMessages(selectedConvId);
  }, [selectedConvId, fetchMessages]);

  // Auto-refresh messages every 10s when a conversation is open
  useEffect(() => {
    if (!selectedConvId) return;
    const interval = setInterval(() => fetchMessages(selectedConvId), 10_000);
    return () => clearInterval(interval);
  }, [selectedConvId, fetchMessages]);

  // Auto-refresh conversations every 30s
  useEffect(() => {
    const interval = setInterval(fetchConversations, 30_000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════
  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || !selectedConvId) return;
    try {
      await fetch(`${API}/api/conversations/${selectedConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chatInput.trim(), senderId: userId, senderName: userName }),
      });
      fetchMessages(selectedConvId);
    } catch {}
    setChatInput("");
    setReplyTo(null);
  }, [chatInput, selectedConvId, replyTo, userId, userName, fetchMessages]);

  const createConversation = useCallback(async (contact: Contact) => {
    try {
      const res = await fetch(`${API}/api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "direct", name: contact.name, participants: [userId, contact.id] }),
      });
      const data = await res.json();
      if (data.data) {
        setSelectedConvId(data.data.id);
        setActiveTab("chats");
        setCreateConvOpen(false);
        fetchConversations();
      }
    } catch {}
  }, [userId, fetchConversations]);

  const createGroupConversation = useCallback(async () => {
    const participantIds = newConvParticipant.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      await fetch(`${API}/api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "group", name: newConvName || "Group Chat", participants: [...new Set([userId, ...participantIds])] }),
      });
      setCreateConvOpen(false);
      setNewConvName("");
      setNewConvParticipant("");
      fetchConversations();
    } catch {}
  }, [newConvName, newConvParticipant, userId, fetchConversations]);

  const openContactChat = useCallback((contact: Contact) => {
    const existing = conversations.find((c) => c.type === "direct" && c.participants.includes(contact.id) && c.participants.includes(userId));
    if (existing) {
      setSelectedConvId(existing.id);
    } else {
      createConversation(contact);
    }
    setShowMobileChat(true);
  }, [conversations, userId, createConversation]);

  // ═══════════════════════════════════════════════════════════════════════
  // FILTERED DATA
  // ═══════════════════════════════════════════════════════════════════════
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.department.toLowerCase().includes(q));
  }, [contacts, searchQuery]);

  const filteredConversations = useMemo(() => {
    let list = conversations.filter((c) => !c.archivedBy?.includes(userId));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.lastMessage?.text?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      if (a.pinnedBy?.includes(userId) && !b.pinnedBy?.includes(userId)) return -1;
      if (!a.pinnedBy?.includes(userId) && b.pinnedBy?.includes(userId)) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [conversations, searchQuery, userId]);

  const filteredMessages = useMemo(() => {
    let list = messages.filter((m) => !m.deleted);
    if (msgSearch) {
      const q = msgSearch.toLowerCase();
      list = list.filter((m) => m.text.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q));
    }
    return list;
  }, [messages, msgSearch]);

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getContactForUser = useCallback((conv: Conversation) => {
    const otherId = conv.participants.find((p) => p !== userId);
    return contacts.find((c) => c.id === otherId) || null;
  }, [contacts, userId]);

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN VIEW
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <>
      {chatPageJsonLd().map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }} />
      ))}
      <div className="flex flex-1 h-full overflow-hidden -m-2 sm:-m-3 md:-m-4 lg:-m-6 -mt-2 sm:-mt-3 md:-mt-4 lg:-mt-6 pb-16 sm:pb-0">
        {/* ── LEFT PANEL ──────────────────────────────────────── */}
        <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col bg-background ${showMobileChat ? "hidden md:flex" : "flex"}`}>
          {/* Header */}
          <div className="px-4 py-3 border-b shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold">Chat</h1>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setCreateConvOpen(true)}><PlusIcon className="size-4" /></Button>
              </div>
            </div>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="" className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b px-2 shrink-0">
              <TabsList className="h-9 w-full">
                <TabsTrigger value="chats" className="text-xs flex-1"><ChatIcon className="size-3.5 mr-1" /> Chats</TabsTrigger>
                <TabsTrigger value="contacts" className="text-xs flex-1"><UsersIcon className="size-3.5 mr-1" /> Contacts</TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs flex-1 relative">
                  <BellIcon className="size-3.5 mr-1" /> Notif
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">{unreadCount}</span>}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Chats Tab */}
            <TabsContent value="chats" className="flex-1 overflow-auto m-0 p-0">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageSquareIcon className="size-10 mb-3 opacity-30" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start chatting from Contacts</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const contact = getContactForUser(conv);
                  const status = contact?.presence?.status || "offline";
                  return (
                    <div key={conv.id} onClick={() => { setSelectedConvId(conv.id); setShowMobileChat(true); }}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b ${selectedConvId === conv.id ? "bg-muted" : ""}`}>
                      <div className="relative shrink-0">
                        <Avatar className="size-10">
                          <AvatarImage src={contact?.avatar || conv.avatar} />
                          <AvatarFallback className="text-xs">{getInitials(contact?.name || conv.name || "?")}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background ${status === "online" ? "bg-green-500" : status === "busy" ? "bg-red-500" : status === "away" ? "bg-yellow-500" : "bg-gray-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{contact?.name || conv.name}</span>
                          {conv.lastMessage && <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(conv.lastMessage.timestamp)}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {conv.pinnedBy?.includes(userId) && <PinIcon className="size-3 text-muted-foreground shrink-0" />}
                          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage?.senderId === userId ? `You: ${conv.lastMessage?.text}` : conv.lastMessage?.text || "No messages yet"}</p>
                        </div>
                      </div>
                      {(conv.unreadCount?.[userId] || 0) > 0 && (
                        <Badge className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] shrink-0">{conv.unreadCount[userId]}</Badge>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="flex-1 overflow-auto m-0 p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <UsersIcon className="size-10 mb-3 opacity-30" />
                  <p className="text-sm">No contacts found</p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Staff ({filteredContacts.filter((c) => c.type === "employee").length})</p></div>
                  {filteredContacts.filter((c) => c.type === "employee").map((contact) => {
                    const status = contact.presence?.status || "offline";
                    return (
                      <div key={contact.id} onClick={() => openContactChat(contact)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors border-b">
                        <div className="relative shrink-0">
                          <Avatar className="size-9">
                            <AvatarImage src={contact.avatar} />
                            <AvatarFallback className="text-xs">{getInitials(contact.name)}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${status === "online" ? "bg-green-500" : status === "busy" ? "bg-red-500" : "bg-gray-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{contact.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{contact.role} {contact.department ? `· ${contact.department}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); setShowProfile(true); setSelectedContact(contact); }}>
                            <InfoIcon className="size-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredContacts.filter((c) => c.type === "client").length > 0 && (
                    <>
                      <div className="px-4 py-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clients ({filteredContacts.filter((c) => c.type === "client").length})</p></div>
                      {filteredContacts.filter((c) => c.type === "client").map((contact) => (
                        <div key={contact.id} onClick={() => openContactChat(contact)}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors border-b">
                          <Avatar className="size-9">
                            <AvatarFallback className="text-xs bg-primary/10">{getInitials(contact.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{contact.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{contact.company || contact.email}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="flex-1 overflow-auto m-0 p-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><BellIcon className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No notifications</p></div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`flex items-start gap-3 p-2 rounded-lg mb-1 ${n.read ? "" : "bg-muted/50"}`}>
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><BellIcon className="size-4 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ── RIGHT PANEL: Chat / Empty ───────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0 ${!showMobileChat ? "hidden md:flex" : "flex"}`}>
          {selectedConvId && selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b shrink-0">
                <Button variant="ghost" size="icon" className="size-8 md:hidden" onClick={() => setShowMobileChat(false)}><ChevronLeftIcon className="size-4" /></Button>
                {(() => { const contact = getContactForUser(selectedConv); return (
                  <>
                    <Avatar className="size-9">
                      <AvatarImage src={contact?.avatar} />
                      <AvatarFallback className="text-xs">{getInitials(contact?.name || selectedConv.name || "?")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold truncate">{contact?.name || selectedConv.name}</h2>
                      {contact && <p className="text-xs text-muted-foreground">{contact.role}{contact.department ? ` · ${contact.department}` : ""}</p>}
                    </div>
                  </>
                ); })()}
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setShowMsgSearch(!showMsgSearch)}><SearchIcon className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => { const c = getContactForUser(selectedConv); if (c) { setSelectedContact(c); setShowProfile(true); } }}><InfoIcon className="size-4" /></Button>
                </div>
              </div>

              {showMsgSearch && (
                <div className="px-4 py-2 border-b shrink-0">
                  <Input placeholder="" value={msgSearch} onChange={(e) => setMsgSearch(e.target.value)} className="h-8" />
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-3">
                  {filteredMessages.map((msg) => {
                    const isOwn = msg.senderId === userId;
                    const replyMsg = msg.replyTo ? messages.find((m) => m.id === msg.replyTo) : null;
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
                        {!isOwn && <Avatar className="size-8 shrink-0"><AvatarImage src={msg.senderAvatar} /><AvatarFallback className="text-xs">{msg.senderName?.charAt(0)}</AvatarFallback></Avatar>}
                        <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                          {!isOwn && <p className="text-xs font-medium text-muted-foreground mb-0.5">{msg.senderName}</p>}
                          {replyMsg && <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 mb-1 border-l-2 border-primary"><span className="font-medium">{replyMsg.senderName}</span>: {replyMsg.text.substring(0, 50)}</div>}
                          <div className={`rounded-xl px-3 py-2 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            {msg.type === "system" ? <p className="text-xs text-muted-foreground italic text-center">{msg.text}</p> : msg.deleted ? <p className="text-xs italic opacity-50">Message deleted</p> : <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {msg.edited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                            {isOwn && (msg.readBy.length > 1 ? <CheckCheckIcon className="size-3 text-blue-500" /> : <CheckIcon className="size-3 text-muted-foreground" />)}
                          </div>
                          {msg.reactions.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {[...new Set(msg.reactions.map((r) => r.emoji))].map((emoji) => (
                                <button key={emoji} className="text-xs bg-muted rounded-full px-1.5 py-0.5 hover:bg-muted/80">{emoji} {msg.reactions.filter((r) => r.emoji === emoji).length}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply Preview */}
              {replyTo && (
                <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-2 shrink-0">
                  <ReplyIcon className="size-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium">{replyTo.senderName}</p><p className="text-xs text-muted-foreground truncate">{replyTo.text}</p></div>
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => setReplyTo(null)}><XCircleIcon className="size-3" /></Button>
                </div>
              )}

              {/* Input */}
              <div className="px-4 py-3 border-t shrink-0">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="size-9 shrink-0"><PaperclipIcon className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className="size-9 shrink-0"><ImageIcon className="size-4" /></Button>
                  <Input placeholder="" value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    className="flex-1" />
                  <Button variant="ghost" size="icon" className="size-9 shrink-0"><SmileIcon className="size-4" /></Button>
                  <Button size="icon" className="size-9 shrink-0" onClick={sendMessage} disabled={!chatInput.trim()}><SendIcon className="size-4" /></Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquareIcon className="size-16 mb-4 opacity-20" />
              <h2 className="text-xl font-semibold mb-1">Welcome to Chat</h2>
              <p className="text-sm mb-4">Select a contact to start messaging</p>
              <Button onClick={() => setActiveTab("contacts")}><UsersIcon className="size-4 mr-2" /> View Contacts</Button>
            </div>
          )}
        </div>

        {/* ── Profile Panel ───────────────────────────────────── */}
        {showProfile && selectedContact && (
          <div className="fixed right-0 top-0 bottom-0 w-80 border-l bg-background z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Profile</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowProfile(false)}>✕</Button>
            </div>
            <div className="flex-1 overflow-auto p-4 text-center">
              <Avatar className="size-20 mx-auto mb-3">
                <AvatarImage src={selectedContact.avatar} />
                <AvatarFallback className="text-xl">{getInitials(selectedContact.name)}</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold">{selectedContact.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedContact.role}</p>
              <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs ${selectedContact.presence?.status === "online" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                <div className={`size-1.5 rounded-full ${selectedContact.presence?.status === "online" ? "bg-green-500" : "bg-gray-400"}`} />
                {selectedContact.presence?.status === "online" ? "Online" : "Offline"}
              </div>
              <Separator className="my-4" />
              <div className="space-y-3 text-left">
                {selectedContact.email && <div className="flex items-center gap-2 text-sm"><MailIcon className="size-4 text-muted-foreground" /><span>{selectedContact.email}</span></div>}
                {selectedContact.phone && <div className="flex items-center gap-2 text-sm"><PhoneCallIcon className="size-4 text-muted-foreground" /><span>{selectedContact.phone}</span></div>}
                {selectedContact.department && <div className="flex items-center gap-2 text-sm"><Building2Icon className="size-4 text-muted-foreground" /><span>{selectedContact.department}</span></div>}
                {selectedContact.company && <div className="flex items-center gap-2 text-sm"><Building2Icon className="size-4 text-muted-foreground" /><span>{selectedContact.company}</span></div>}
                <div className="flex items-center gap-2 text-sm"><UserIcon className="size-4 text-muted-foreground" /><span className="capitalize">{selectedContact.type}</span></div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button className="flex-1" onClick={() => { openContactChat(selectedContact); setShowProfile(false); }}>
                  <MessageSquareIcon className="size-4 mr-1" /> Message
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Create Conversation Modal ──────────────────────── */}
        <Dialog open={createConvOpen} onOpenChange={setCreateConvOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Conversation</DialogTitle>
              <DialogDescription>Start a chat with a team member</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-sm font-medium">Group Name (optional)</label>
                <Input placeholder="" value={newConvName} onChange={(e) => setNewConvName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Participant IDs (comma-separated)</label>
                <Input placeholder="" value={newConvParticipant} onChange={(e) => setNewConvParticipant(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={createGroupConversation} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
