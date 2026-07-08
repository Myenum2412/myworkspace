"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  MessageSquareIcon, PhoneIcon, VideoIcon, UsersIcon, BellIcon, SettingsIcon,
  SearchIcon, SendIcon, PlusIcon, MoreVerticalIcon, PinIcon, ArchiveIcon,
  Trash2Icon, EditIcon, ReplyIcon, SmileIcon, PaperclipIcon, ImageIcon,
  MicIcon, MicOffIcon, VideoOffIcon, ScreenShareIcon, ScreenShareOffIcon,
  HandIcon, PhoneOffIcon, LogInIcon, ClockIcon, CheckCheckIcon, CheckIcon,
  CircleIcon, XCircleIcon, LockIcon, UnlockIcon, UserPlusIcon, Search,
  ChevronLeftIcon, StarIcon, EyeIcon, CopyIcon, ForwardIcon, AtSignIcon,
  FileTextIcon, DownloadIcon, CalendarIcon, Copy,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || "http://localhost:4001";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════
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
  mutedBy: string[];
  unreadCount: Record<string, number>;
  isLocked: boolean;
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
  conversationId: string | null;
  createdBy: string;
  hostId: string;
  participants: string[];
  isActive: boolean;
  startedAt: string;
  endedAt: string | null;
  duration: number;
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

interface Presence {
  userId: string;
  status: "online" | "offline" | "busy" | "away";
  lastSeen: string;
}

interface Notification {
  _id: string;
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function ChatPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "";
  const userName = session?.user?.name || "User";
  const userAvatar = session?.user?.image || "";

  // ── Socket State ─────────────────────────────────────────────
  const socketRef = useRef<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // ── Navigation ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"chats" | "calls" | "meetings" | "contacts" | "notifications">("chats");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // ── Data ─────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [presences, setPresences] = useState<Record<string, string>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  // ── Chat State ───────────────────────────────────────────────
  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");

  // ── Modals ───────────────────────────────────────────────────
  const [createConvOpen, setCreateConvOpen] = useState(false);
  const [newConvName, setNewConvName] = useState("");
  const [newConvParticipants, setNewConvParticipants] = useState("");

  // ── Call State ───────────────────────────────────────────────
  const [inCall, setInCall] = useState(false);
  const [callRoomId, setCallRoomId] = useState<string | null>(null);
  const [callParticipants, setCallParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showCallChat, setShowCallChat] = useState(false);
  const [callChatMessages, setCallChatMessages] = useState<any[]>([]);
  const [callChatInput, setCallChatInput] = useState("");
  const [callType, setCallType] = useState<"audio" | "video">("video");

  // ── Meeting State ────────────────────────────────────────────
  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingPassword, setMeetingPassword] = useState("");

  // ── Refs ─────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // SOCKET CONNECTION
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!userId) return;

    import("socket.io-client").then(({ io }) => {
      const socket = io(API, {
        transports: ["websocket", "polling"],
        auth: { userId, userName, userAvatar },
      });

      socket.on("connect", () => setSocketConnected(true));
      socket.on("disconnect", () => setSocketConnected(false));

      socket.on("new-message", (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
        if (msg.conversationId !== selectedConvId) {
          setConversations((prev) => prev.map((c) =>
            c.id === msg.conversationId
              ? { ...c, lastMessage: { text: msg.text, senderId: msg.senderId, senderName: msg.senderName, timestamp: msg.createdAt } }
              : c
          ));
        }
      });

      socket.on("message-edited", (data: any) => {
        setMessages((prev) => prev.map((m) => m.id === data.messageId ? { ...m, text: data.text, edited: true } : m));
      });

      socket.on("message-deleted", (data: any) => {
        setMessages((prev) => prev.map((m) => m.id === data.messageId ? { ...m, deleted: true } : m));
      });

      socket.on("message-reaction", (data: any) => {
        setMessages((prev) => prev.map((m) => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
      });

      socket.on("typing", (data: any) => {
        setTypingUsers((prev) => {
          const conv = prev[data.conversationId] || [];
          if (data.isTyping) {
            if (!conv.includes(data.userName)) return { ...prev, [data.conversationId]: [...conv, data.userName] };
          } else {
            return { ...prev, [data.conversationId]: conv.filter((n) => n !== data.userName) };
          }
          return prev;
        });
      });

      socket.on("presence-update", (data: any) => {
        setPresences((prev) => ({ ...prev, [data.userId]: data.status }));
      });

      socket.on("conversation-created", (conv: Conversation) => {
        setConversations((prev) => [conv, ...prev]);
      });

      socket.on("notification:" + userId, (notif: Notification) => {
        setNotifications((prev) => [notif, ...prev]);
      });

      // ── Meeting Events ───────────────────────────────────────
      socket.on("participant-joined", (data: any) => {
        setCallParticipants((prev) => [...prev.filter((p) => p.socketId !== data.socketId), { ...data, isMuted: false, isCameraOff: false, isScreenSharing: false, isHandRaised: false }]);
      });

      socket.on("participant-left", (data: any) => {
        setCallParticipants((prev) => prev.filter((p) => p.socketId !== data.socketId));
      });

      socket.on("participant-updated", (data: any) => {
        setCallParticipants((prev) => prev.map((p) => p.socketId === data.socketId ? { ...p, ...data } : p));
      });

      socket.on("meeting-ended", () => {
        setInCall(false);
        setCallRoomId(null);
        setCallParticipants([]);
        stopMedia();
      });

      socket.on("meeting-chat", (data: any) => {
        setCallChatMessages((prev) => [...prev, data]);
      });

      socketRef.current = socket;
    });

    return () => { socketRef.current?.disconnect(); };
  }, [userId, userName, userAvatar]);

  // ═══════════════════════════════════════════════════════════════════════
  // FETCH DATA
  // ═══════════════════════════════════════════════════════════════════════
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`${API}/api/conversations?userId=${userId}`);
    const data = await res.json();
    setConversations(data.data || []);
  }, [userId]);

  const fetchMessages = useCallback(async (convId: string) => {
    const res = await fetch(`${API}/api/conversations/${convId}/messages`);
    const data = await res.json();
    setMessages(data.data || []);
  }, []);

  const fetchMeetings = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`${API}/api/meetings?userId=${userId}`);
    const data = await res.json();
    setMeetings(data.data || []);
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`${API}/api/notifications/${userId}`);
    const data = await res.json();
    setNotifications(data.data || []);
  }, [userId]);

  useEffect(() => { fetchConversations(); fetchMeetings(); fetchNotifications(); }, [fetchConversations, fetchMeetings, fetchNotifications]);

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
      socketRef.current?.emit("join-conversation", selectedConvId);
      socketRef.current?.emit("mark-read", { conversationId: selectedConvId });
    }
  }, [selectedConvId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ═══════════════════════════════════════════════════════════════════════
  // MEDIA HELPERS
  // ═══════════════════════════════════════════════════════════════════════
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) { console.error("Media error:", err); }
  }, []);

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════
  const sendMessage = useCallback(() => {
    if (!chatInput.trim() || !selectedConvId) return;
    socketRef.current?.emit("send-message", {
      conversationId: selectedConvId, text: chatInput.trim(),
      replyTo: replyTo?.id || null,
    });
    setChatInput("");
    setReplyTo(null);
  }, [chatInput, selectedConvId, replyTo]);

  const sendCallMessage = useCallback(() => {
    if (!callChatInput.trim() || !callRoomId) return;
    socketRef.current?.emit("meeting-chat", { text: callChatInput.trim() });
    setCallChatInput("");
  }, [callChatInput, callRoomId]);

  const startCall = useCallback(async (type: "audio" | "video") => {
    setCallType(type);
    socketRef.current?.emit("start-meeting", { title: `${userName}'s ${type} call` }, (res: any) => {
      if (res.success) {
        setInCall(true);
        setCallRoomId(res.roomId);
        startMedia();
      }
    });
  }, [userName, startMedia]);

  const joinCall = useCallback(async (roomId: string, type: "audio" | "video") => {
    setCallType(type);
    socketRef.current?.emit("join-meeting", { roomId }, (res: any) => {
      if (res.success) {
        setInCall(true);
        setCallRoomId(roomId);
        setCallParticipants(res.participants || []);
        startMedia();
      }
    });
  }, [startMedia]);

  const leaveCall = useCallback(() => {
    socketRef.current?.emit("leave-meeting");
    setInCall(false);
    setCallRoomId(null);
    setCallParticipants([]);
    stopMedia();
  }, [stopMedia]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    socketRef.current?.emit("toggle-mute", { muted: next });
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const next = !isCameraOff;
    setIsCameraOff(next);
    socketRef.current?.emit("toggle-camera", { off: next });
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
  }, [isCameraOff]);

  const toggleScreen = useCallback(async () => {
    if (!isScreenSharing) {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      stream.getVideoTracks()[0].onended = () => { setIsScreenSharing(false); socketRef.current?.emit("toggle-screen-share", { sharing: false }); };
      setIsScreenSharing(true);
      socketRef.current?.emit("toggle-screen-share", { sharing: true });
    } else {
      setIsScreenSharing(false);
      socketRef.current?.emit("toggle-screen-share", { sharing: false });
    }
  }, [isScreenSharing]);

  const toggleHand = useCallback(() => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    socketRef.current?.emit("toggle-hand-raise", { raised: next });
  }, [isHandRaised]);

  const createConversation = useCallback(() => {
    const participants = newConvParticipants.split(",").map((s) => s.trim()).filter(Boolean);
    socketRef.current?.emit("create-conversation", {
      type: participants.length > 1 ? "group" : "direct",
      name: newConvName || (participants.length > 1 ? newConvName : ""),
      participants: [...new Set([userId, ...participants])],
    }, (res: any) => {
      if (res.success) {
        setCreateConvOpen(false);
        setNewConvName("");
        setNewConvParticipants("");
        setSelectedConvId(res.conversation.id);
        fetchConversations();
      }
    });
  }, [newConvName, newConvParticipants, userId, fetchConversations]);

  const createMeeting = useCallback(() => {
    socketRef.current?.emit("start-meeting", { title: meetingTitle || "Meeting", password: meetingPassword || undefined }, (res: any) => {
      if (res.success) {
        setCreateMeetingOpen(false);
        setMeetingTitle("");
        setMeetingPassword("");
        setInCall(true);
        setCallRoomId(res.roomId);
        startMedia();
        fetchMeetings();
      }
    });
  }, [meetingTitle, meetingPassword, startMedia, fetchMeetings]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (selectedConvId) socketRef.current?.emit("typing", { conversationId: selectedConvId, isTyping });
  }, [selectedConvId]);

  // ═══════════════════════════════════════════════════════════════════════
  // FILTERED DATA
  // ═══════════════════════════════════════════════════════════════════════
  const filteredConversations = useMemo(() => {
    let list = conversations.filter((c) => !c.archivedBy?.includes(userId));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.lastMessage?.text?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      if (a.pinnedBy?.includes(userId) && !b.pinnedBy?.includes(userId)) return -1;
      if (!a.pinnedBy?.includes(userId) && b.pinnedBy?.includes(userId)) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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
  const typingInConv = typingUsers[selectedConvId || ""] || [];

  // ═══════════════════════════════════════════════════════════════════════
  // IN-CALL VIEW
  // ═══════════════════════════════════════════════════════════════════════
  if (inCall) {
    return (
      <div className="flex flex-1 flex-col h-full bg-gray-950 text-white">
        {/* Call Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Meeting Active</span>
            <Badge variant="outline" className="text-xs border-gray-700">{callParticipants.length + 1} participants</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" onClick={() => setShowCallChat(!showCallChat)}>
              <MessageSquareIcon className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" onClick={() => setShowCallChat(!showCallChat)}>
              <UsersIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-3 h-full" style={{ gridTemplateColumns: `repeat(${Math.min(callParticipants.length + 1, 4)}, 1fr)` }}>
            {/* Local Video */}
            <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video min-h-[200px]">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <Badge className="bg-black/60 text-white border-0 text-xs">You</Badge>
                {isMuted && <MicOffIcon className="size-3 text-red-400" />}
                {isHandRaised && <HandIcon className="size-3 text-yellow-400" />}
              </div>
            </div>

            {/* Remote Videos */}
            {callParticipants.map((p) => (
              <div key={p.socketId} className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video min-h-[200px]">
                <div className="w-full h-full flex items-center justify-center">
                  {p.isCameraOff ? (
                    <div className="size-16 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold">{p.name.charAt(0)}</div>
                  ) : (
                    <video autoPlay playsInline className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <Badge className="bg-black/60 text-white border-0 text-xs">{p.name}</Badge>
                  {p.isMuted && <MicOffIcon className="size-3 text-red-400" />}
                  {p.isHandRaised && <HandIcon className="size-3 text-yellow-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-900 border-t border-gray-800">
          <Button variant={isMuted ? "destructive" : "secondary"} size="lg" onClick={toggleMute} className="rounded-full size-12 p-0">
            {isMuted ? <MicOffIcon className="size-5" /> : <MicIcon className="size-5" />}
          </Button>
          <Button variant={isCameraOff ? "destructive" : "secondary"} size="lg" onClick={toggleCamera} className="rounded-full size-12 p-0">
            {isCameraOff ? <VideoOffIcon className="size-5" /> : <VideoIcon className="size-5" />}
          </Button>
          <Button variant={isScreenSharing ? "secondary" : "outline"} size="lg" onClick={toggleScreen} className="rounded-full size-12 p-0 border-gray-700">
            {isScreenSharing ? <ScreenShareOffIcon className="size-5" /> : <ScreenShareIcon className="size-5" />}
          </Button>
          <Button variant={isHandRaised ? "secondary" : "outline"} size="lg" onClick={toggleHand} className="rounded-full size-12 p-0 border-gray-700">
            <HandIcon className="size-5" />
          </Button>
          <Button variant="destructive" size="lg" onClick={leaveCall} className="rounded-full size-12 p-0">
            <PhoneOffIcon className="size-5" />
          </Button>
        </div>

        {/* Call Chat Sidebar */}
        {showCallChat && (
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h3 className="font-semibold text-sm">Meeting Chat</h3>
              <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => setShowCallChat(false)}>✕</Button>
            </div>
            <ScrollArea className="flex-1 p-3">
              {callChatMessages.map((msg, i) => (
                <div key={i} className="mb-3">
                  <span className="text-xs font-medium text-blue-400">{msg.userName}</span>
                  <p className="text-sm text-gray-200">{msg.text}</p>
                </div>
              ))}
            </ScrollArea>
            <div className="p-3 border-t border-gray-800">
              <div className="flex gap-2">
                <Input placeholder="Type..." value={callChatInput} onChange={(e) => setCallChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendCallMessage(); }} className="bg-gray-800 border-gray-700 text-white" />
                <Button size="sm" onClick={sendCallMessage}><SendIcon className="size-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN CHAT VIEW
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* ── Left Sidebar ──────────────────────────────────────── */}
      <div className={`w-80 border-r flex flex-col bg-background ${showMobileChat ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold">Chat</h1>
            <div className="flex items-center gap-1">
              <Badge variant={socketConnected ? "default" : "destructive"} className="text-[10px]">
                {socketConnected ? "Online" : "Offline"}
              </Badge>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setCreateConvOpen(true)}>
                <PlusIcon className="size-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-2">
            <TabsList className="h-9 w-full">
              <TabsTrigger value="chats" className="text-xs flex-1">
                <MessageSquareIcon className="size-3.5 mr-1" /> Chats
              </TabsTrigger>
              <TabsTrigger value="calls" className="text-xs flex-1">
                <PhoneIcon className="size-3.5 mr-1" /> Calls
              </TabsTrigger>
              <TabsTrigger value="meetings" className="text-xs flex-1">
                <VideoIcon className="size-3.5 mr-1" /> Meetings
              </TabsTrigger>
              <TabsTrigger value="contacts" className="text-xs flex-1">
                <UsersIcon className="size-3.5 mr-1" /> Contacts
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs flex-1 relative">
                <BellIcon className="size-3.5 mr-1" /> Notif
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">{unreadCount}</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Conversations List */}
          <TabsContent value="chats" className="flex-1 overflow-auto m-0 p-0">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquareIcon className="size-10 mb-3 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setCreateConvOpen(true)}>
                  <PlusIcon className="size-3 mr-1" /> Start Chat
                </Button>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => { setSelectedConvId(conv.id); setShowMobileChat(true); }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedConvId === conv.id ? "bg-muted" : ""}`}
                >
                  <div className="relative">
                    <Avatar className="size-10">
                      <AvatarImage src={conv.avatar} />
                      <AvatarFallback className="text-xs">{conv.name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    {presences[conv.participants.find((p) => p !== userId) || ""] === "online" && (
                      <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{conv.name || "Direct Chat"}</span>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(conv.lastMessage.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {conv.pinnedBy?.includes(userId) && <PinIcon className="size-3 text-muted-foreground shrink-0" />}
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage?.text || "No messages yet"}</p>
                    </div>
                  </div>
                  {(conv.unreadCount?.[userId] || 0) > 0 && (
                    <Badge className="size-5 rounded-full p-0 flex items-center justify-center text-[10px]">{conv.unreadCount[userId]}</Badge>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Calls Tab */}
          <TabsContent value="calls" className="flex-1 overflow-auto m-0 p-3 space-y-2">
            <Button className="w-full" onClick={() => startCall("video")}>
              <VideoIcon className="size-4 mr-2" /> New Video Call
            </Button>
            <Button variant="outline" className="w-full" onClick={() => startCall("audio")}>
              <PhoneIcon className="size-4 mr-2" /> New Audio Call
            </Button>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground font-medium">Recent Calls</p>
            {meetings.filter((m) => m.endedAt).slice(0, 10).map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                  <PhoneIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => joinCall(m.roomId, "video")}>
                  <VideoIcon className="size-4" />
                </Button>
              </div>
            ))}
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="flex-1 overflow-auto m-0 p-3 space-y-2">
            <Button className="w-full" onClick={() => setCreateMeetingOpen(true)}>
              <PlusIcon className="size-4 mr-2" /> Schedule Meeting
            </Button>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground font-medium">Active Meetings</p>
            {meetings.filter((m) => m.isActive).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No active meetings</p>
            ) : (
              meetings.filter((m) => m.isActive).map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{m.participants.length} participants</p>
                      </div>
                      <Button size="sm" onClick={() => joinCall(m.roomId, "video")}>
                        <LogInIcon className="size-3 mr-1" /> Join
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="flex-1 overflow-auto m-0 p-3">
            <p className="text-xs text-muted-foreground font-medium mb-2">Staff Members</p>
            {["Admin User", "Staff Member 1", "Staff Member 2"].map((name) => (
              <div key={name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">Staff</p>
                </div>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => startCall("video")}>
                  <VideoIcon className="size-3.5" />
                </Button>
              </div>
            ))}
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground font-medium mb-2">Clients</p>
            {["Client A", "Client B"].map((name) => (
              <div key={name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">Client</p>
                </div>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => startCall("video")}>
                  <VideoIcon className="size-3.5" />
                </Button>
              </div>
            ))}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="flex-1 overflow-auto m-0 p-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BellIcon className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-2 rounded-lg mb-1 ${n.read ? "" : "bg-muted/50"}`}>
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <BellIcon className="size-4 text-primary" />
                  </div>
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

      {/* ── Right: Chat Area ──────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!showMobileChat ? "hidden md:flex" : "flex"}`}>
        {selectedConvId && selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b">
              <Button variant="ghost" size="icon" className="size-8 md:hidden" onClick={() => setShowMobileChat(false)}>
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Avatar className="size-9">
                <AvatarImage src={selectedConv.avatar} />
                <AvatarFallback className="text-xs">{selectedConv.name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate">{selectedConv.name || "Direct Chat"}</h2>
                {typingInConv.length > 0 && (
                  <p className="text-xs text-muted-foreground animate-pulse">{typingInConv.join(", ")} typing...</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8" onClick={() => startCall("audio")}>
                  <PhoneIcon className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => startCall("video")}>
                  <VideoIcon className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setShowSearch(!showSearch)}>
                  <SearchIcon className="size-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreVerticalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><PinIcon className="size-4 mr-2" /> Pin</DropdownMenuItem>
                    <DropdownMenuItem><ArchiveIcon className="size-4 mr-2" /> Archive</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive"><Trash2Icon className="size-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Search Bar */}
            {showSearch && (
              <div className="px-4 py-2 border-b">
                <Input placeholder="Search messages..." value={msgSearch} onChange={(e) => setMsgSearch(e.target.value)} className="h-8" />
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
                      {!isOwn && (
                        <Avatar className="size-8 shrink-0">
                          <AvatarImage src={msg.senderAvatar} />
                          <AvatarFallback className="text-xs">{msg.senderName?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                        {!isOwn && <p className="text-xs font-medium text-muted-foreground mb-0.5">{msg.senderName}</p>}

                        {replyMsg && (
                          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 mb-1 border-l-2 border-primary">
                            <span className="font-medium">{replyMsg.senderName}</span>: {replyMsg.text.substring(0, 50)}
                          </div>
                        )}

                        <div className={`rounded-xl px-3 py-2 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {msg.type === "system" ? (
                            <p className="text-xs text-muted-foreground italic text-center">{msg.text}</p>
                          ) : msg.deleted ? (
                            <p className="text-xs italic opacity-50">Message deleted</p>
                          ) : (
                            <p>{msg.text}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {msg.edited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                          {isOwn && (
                            msg.readBy.length > 1
                              ? <CheckCheckIcon className="size-3 text-blue-500" />
                              : <CheckIcon className="size-3 text-muted-foreground" />
                          )}
                        </div>

                        {/* Reactions */}
                        {msg.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {[...new Set(msg.reactions.map((r) => r.emoji))].map((emoji) => (
                              <button key={emoji} className="text-xs bg-muted rounded-full px-1.5 py-0.5 hover:bg-muted/80">
                                {emoji} {msg.reactions.filter((r) => r.emoji === emoji).length}
                              </button>
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
              <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-2">
                <ReplyIcon className="size-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{replyTo.senderName}</p>
                  <p className="text-xs text-muted-foreground truncate">{replyTo.text}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-6" onClick={() => setReplyTo(null)}>
                  <XCircleIcon className="size-3" />
                </Button>
              </div>
            )}

            {/* Message Input */}
            <div className="px-4 py-3 border-t">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="size-9 shrink-0">
                  <PaperclipIcon className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-9 shrink-0">
                  <ImageIcon className="size-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => { setChatInput(e.target.value); sendTyping(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  onBlur={() => sendTyping(false)}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" className="size-9 shrink-0">
                  <SmileIcon className="size-4" />
                </Button>
                <Button size="icon" className="size-9 shrink-0" onClick={sendMessage} disabled={!chatInput.trim()}>
                  <SendIcon className="size-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquareIcon className="size-16 mb-4 opacity-20" />
            <h2 className="text-xl font-semibold mb-1">Welcome to Chat</h2>
            <p className="text-sm mb-4">Select a conversation or start a new one</p>
            <Button onClick={() => setCreateConvOpen(true)}>
              <PlusIcon className="size-4 mr-2" /> New Conversation
            </Button>
          </div>
        )}
      </div>

      {/* ── Create Conversation Modal ─────────────────────────── */}
      <Dialog open={createConvOpen} onOpenChange={setCreateConvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>Start a chat with staff or clients</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Conversation Name (for groups)</label>
              <Input placeholder="e.g. Project Team" value={newConvName} onChange={(e) => setNewConvName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Participants (comma-separated user IDs)</label>
              <Input placeholder="user-id-1, user-id-2" value={newConvParticipants} onChange={(e) => setNewConvParticipants(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={createConversation} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Meeting Modal ──────────────────────────────── */}
      <Dialog open={createMeetingOpen} onOpenChange={setCreateMeetingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>Create a new video meeting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Meeting Title</label>
              <Input placeholder="e.g. Team Standup" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Password (optional)</label>
              <Input type="password" placeholder="Leave empty for no password" value={meetingPassword} onChange={(e) => setMeetingPassword(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={createMeeting} className="w-full">
              <VideoIcon className="size-4 mr-2" /> Start Meeting
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
