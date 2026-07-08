"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  VideoIcon,
  PhoneOffIcon,
  MicIcon,
  MicOffIcon,
  VideoOffIcon,
  ScreenShareIcon,
  ScreenShareOffIcon,
  HandIcon,
  MessageSquareIcon,
  UsersIcon,
  PlusIcon,
  LogInIcon,
  SendIcon,
  SettingsIcon,
  SpeakerIcon,
} from "lucide-react";
import { useChatSocket } from "@/components/chat/use-chat-socket";
import type { Participant, ChatMessage, Room } from "@/components/chat/types";

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { socket, connected, emit, on } = useChatSocket();

  // State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const userId = session?.user?.id || "";
  const userName = session?.user?.name || "User";
  const userAvatar = session?.user?.image || "";

  // ── Fetch Rooms ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_CHAT_SERVER_URL || "http://localhost:4001"}/api/rooms`)
      .then((r) => r.json())
      .then((data) => setRooms(data.data || []))
      .catch(() => {});
  }, [currentRoom]);

  // ── Socket Listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!connected) return;

    const unsubs = [
      on("participant-joined", (data: unknown) => {
        const d = data as { socketId: string; userId: string; name: string; avatar: string };
        setParticipants((prev) => [...prev, { ...d, isMuted: false, isCameraOff: false, isScreenSharing: false, isHandRaised: false }]);
      }),
      on("participant-left", (data: unknown) => {
        const d = data as { socketId: string };
        setParticipants((prev) => prev.filter((p) => p.socketId !== d.socketId));
      }),
      on("participant-updated", (data: unknown) => {
        const d = data as { socketId: string; isMuted?: boolean; isCameraOff?: boolean; isScreenSharing?: boolean; isHandRaised?: boolean };
        setParticipants((prev) =>
          prev.map((p) =>
            p.socketId === d.socketId
              ? { ...p, ...(d.isMuted !== undefined && { isMuted: d.isMuted }), ...(d.isCameraOff !== undefined && { isCameraOff: d.isCameraOff }), ...(d.isScreenSharing !== undefined && { isScreenSharing: d.isScreenSharing }), ...(d.isHandRaised !== undefined && { isHandRaised: d.isHandRaised }) }
              : p
          )
        );
      }),
      on("chat-message", (msg: unknown) => {
        setMessages((prev) => [...prev, msg as ChatMessage]);
      }),
      on("new-producer", () => {}),
      on("emoji-reaction", () => {}),
    ];

    return () => unsubs.forEach((u) => u());
  }, [connected, on]);

  // ── Local Media ──────────────────────────────────────────────
  const startLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Failed to get media:", err);
    }
  }, []);

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
  }, []);

  // ── Create Room ──────────────────────────────────────────────
  const handleCreateRoom = useCallback(() => {
    if (!roomName.trim()) return;
    emit("create-room", {
      name: roomName.trim(),
      password: roomPassword || undefined,
      userId,
      userName,
      userAvatar,
    }, (res: unknown) => {
      const r = res as { success: boolean; roomId?: string; error?: string };
      if (r.success && r.roomId) {
        setCurrentRoom(r.roomId);
        setCreateModalOpen(false);
        setRoomName("");
        setRoomPassword("");
        startLocalMedia();
      }
    });
  }, [roomName, roomPassword, userId, userName, userAvatar, emit, startLocalMedia]);

  // ── Join Room ────────────────────────────────────────────────
  const handleJoinRoom = useCallback((roomId?: string) => {
    const targetId = roomId || joinRoomId;
    if (!targetId) return;
    emit("join-room", {
      roomId: targetId,
      password: joinPassword || undefined,
      userId,
      userName,
      userAvatar,
    }, (res: unknown) => {
      const r = res as { success: boolean; participants?: Participant[]; error?: string; routerRtpCapabilities?: unknown };
      if (r.success) {
        setCurrentRoom(targetId);
        setParticipants(r.participants || []);
        setJoinModalOpen(false);
        setJoinPassword("");
        setJoinRoomId("");
        startLocalMedia();
        // Load chat history
        emit("get-chat-history", { roomId: targetId }, (histRes: unknown) => {
          const h = histRes as { messages?: ChatMessage[] };
          if (h.messages) setMessages(h.messages);
        });
      }
    });
  }, [joinRoomId, joinPassword, userId, userName, userAvatar, emit, startLocalMedia]);

  // ── Leave Room ───────────────────────────────────────────────
  const handleLeaveRoom = useCallback(() => {
    emit("leave-room");
    setCurrentRoom(null);
    setParticipants([]);
    setMessages([]);
    stopLocalMedia();
  }, [emit, stopLocalMedia]);

  // ── Toggle Controls ──────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    emit("toggle-mute", { muted: newMuted });
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !newMuted; });
  }, [isMuted, emit]);

  const toggleCamera = useCallback(() => {
    const newOff = !isCameraOff;
    setIsCameraOff(newOff);
    emit("toggle-camera", { off: newOff });
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !newOff; });
  }, [isCameraOff, emit]);

  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        emit("toggle-screen-share", { sharing: true });
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          emit("toggle-screen-share", { sharing: false });
        };
      } catch {}
    } else {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      emit("toggle-screen-share", { sharing: false });
    }
  }, [isScreenSharing, emit]);

  const toggleHand = useCallback(() => {
    const newRaised = !isHandRaised;
    setIsHandRaised(newRaised);
    emit("toggle-hand-raise", { raised: newRaised });
  }, [isHandRaised, emit]);

  // ── Send Chat ────────────────────────────────────────────────
  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    emit("chat-message", { text: chatInput.trim() });
    setChatInput("");
  }, [chatInput, emit]);

  // ── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (currentRoom) emit("leave-room");
      stopLocalMedia();
    };
  }, []);

  // ── In Meeting View ──────────────────────────────────────────
  if (currentRoom) {
    return (
      <div className="flex flex-1 flex-col h-full">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
          <div className="flex items-center gap-3">
            <VideoIcon className="size-5 text-primary" />
            <h1 className="text-sm font-semibold">Meeting</h1>
            <Badge variant="secondary" className="text-xs">
              <span className="size-1.5 rounded-full bg-green-500 mr-1" />
              {participants.length + 1} participants
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowParticipants(!showParticipants)}>
              <UsersIcon className="size-4 mr-1" /> {participants.length + 1}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)}>
              <MessageSquareIcon className="size-4 mr-1" /> Chat
            </Button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))` }}>
            {/* Local Video */}
            <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-black/50 text-white border-0">
                  You ({userName})
                </Badge>
                {isMuted && <MicOffIcon className="size-4 text-red-400" />}
                {isHandRaised && <HandIcon className="size-4 text-yellow-400" />}
              </div>
            </div>

            {/* Remote Videos */}
            {participants.map((p) => (
              <div key={p.socketId} className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
                <video
                  ref={(el) => { if (el) remoteVideosRef.current.set(p.socketId, el); }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs bg-black/50 text-white border-0">
                    {p.name}
                  </Badge>
                  {p.isMuted && <MicOffIcon className="size-4 text-red-400" />}
                  {p.isHandRaised && <HandIcon className="size-4 text-yellow-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t bg-background">
          <Button variant={isMuted ? "destructive" : "outline"} size="lg" onClick={toggleMute} className="rounded-full size-12 p-0">
            {isMuted ? <MicOffIcon className="size-5" /> : <MicIcon className="size-5" />}
          </Button>
          <Button variant={isCameraOff ? "destructive" : "outline"} size="lg" onClick={toggleCamera} className="rounded-full size-12 p-0">
            {isCameraOff ? <VideoOffIcon className="size-5" /> : <VideoIcon className="size-5" />}
          </Button>
          <Button variant={isScreenSharing ? "secondary" : "outline"} size="lg" onClick={toggleScreenShare} className="rounded-full size-12 p-0">
            {isScreenSharing ? <ScreenShareOffIcon className="size-5" /> : <ScreenShareIcon className="size-5" />}
          </Button>
          <Button variant={isHandRaised ? "secondary" : "outline"} size="lg" onClick={toggleHand} className="rounded-full size-12 p-0">
            <HandIcon className="size-5" />
          </Button>
          <Button variant="destructive" size="lg" onClick={handleLeaveRoom} className="rounded-full size-12 p-0">
            <PhoneOffIcon className="size-5" />
          </Button>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="fixed right-0 top-0 bottom-0 w-80 border-l bg-background z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Meeting Chat</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>✕</Button>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={msg.type === "system" ? "text-center" : ""}>
                    {msg.type === "system" ? (
                      <p className="text-xs text-muted-foreground italic">{msg.text}</p>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium">{msg.userName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSendChat} disabled={!chatInput.trim()}>
                  <SendIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Participants Panel */}
        {showParticipants && (
          <div className="fixed right-0 top-0 bottom-0 w-72 border-l bg-background z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Participants ({participants.length + 1})</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowParticipants(false)}>✕</Button>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {userName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{userName} (You)</p>
                  </div>
                  {isMuted && <MicOffIcon className="size-3 text-red-500" />}
                </div>
                {participants.map((p) => (
                  <div key={p.socketId} className="flex items-center gap-2 p-2 rounded-lg">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                    </div>
                    {p.isMuted && <MicOffIcon className="size-3 text-red-500" />}
                    {p.isHandRaised && <HandIcon className="size-3 text-yellow-500" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    );
  }

  // ── Lobby View ───────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Video Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Start or join a video meeting with your team
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setCreateModalOpen(true)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <PlusIcon className="size-4" />
              Create Meeting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Start a new video meeting and invite others</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setJoinModalOpen(true)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <LogInIcon className="size-4" />
              Join Meeting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Join an existing meeting with a room ID</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Rooms */}
      {rooms.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Active Meetings</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {rooms.filter((r) => r.isActive).map((room) => (
              <Card key={room.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{room.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {room.participantCount} participant{room.participantCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => { setJoinRoomId(room.id); handleJoinRoom(room.id); }}>
                      <LogInIcon className="size-4 mr-1" /> Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Meeting</DialogTitle>
            <DialogDescription>Set up a new video meeting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Meeting Name</label>
              <Input placeholder="e.g. Team Standup" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Password (optional)</label>
              <Input type="password" placeholder="Leave empty for no password" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={handleCreateRoom} disabled={!roomName.trim()} className="w-full">
              <VideoIcon className="size-4 mr-2" /> Start Meeting
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Modal */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Meeting</DialogTitle>
            <DialogDescription>Enter the meeting room ID to join</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Room ID</label>
              <Input placeholder="Enter room ID" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Password (if required)</label>
              <Input type="password" placeholder="Enter password" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={() => handleJoinRoom()} disabled={!joinRoomId.trim()} className="w-full">
              <LogInIcon className="size-4 mr-2" /> Join Meeting
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connection Status */}
      <div className="text-center">
        <Badge variant={connected ? "default" : "destructive"}>
          {connected ? "Connected to server" : "Connecting..."}
        </Badge>
      </div>
    </div>
  );
}
