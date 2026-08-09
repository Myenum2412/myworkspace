"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  apiEnd,
  apiHandRaise,
  apiLeave,
  apiModerate,
  apiSelfState,
  apiSendChat,
} from "@/lib/call-api";
import {
  ChatIcon,
  HandIcon,
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PhoneOffIcon,
  PlayIcon,
  ScreenShareIcon,
  SettingsIcon,
  VideoIcon,
  VideoOffIcon,
} from "@/lib/icons";
import { useSfuCall } from "@/lib/use-mediasoup-call";
import type { CallMessage, CallSummary } from "@/lib/use-realtime";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatElapsed(startedAt?: string) {
  if (!startedAt) return "00:00";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CallRoom({
  call,
  currentUserId,
  isModerator,
  onLeave,
  onClosed,
}: {
  call: CallSummary;
  currentUserId: string;
  isModerator: boolean;
  onLeave?: () => void;
  onClosed?: () => void;
}) {
  const selfUserId = currentUserId;
  const selfName = call.participants.find((p) => p.userId === currentUserId)?.name || currentUserId;

  const [handRaised, setHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<CallMessage[]>(call.messages || []);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(call.recording);
  const [mutedAll, setMutedAll] = useState(call.mutedAll);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(() => formatElapsed(call.startedAt));
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const sfu = useSfuCall({
    callId: call.id,
    enabled: call.status === "active",
    mediaMode: call.media === "audio" ? "audio" : "video",
    selfUserId,
    selfName,
    onError: setMediaError,
  });
  const {
    localStream,
    remoteStreams,
    micOn,
    camOn,
    screenOn,
    localPreviewRef,
    toggleMic,
    toggleCam,
    toggleScreen,
    leaveCall,
  } = sfu;

  const audio = micOn;
  const video = camOn;
  const screen = screenOn;

  const participants = useMemo(
    () => call.participants.filter((p) => p.userId !== currentUserId),
    [call.participants, currentUserId],
  );

  useEffect(() => {
    const timer = setInterval(() => setElapsed(formatElapsed(call.startedAt)), 1000);
    return () => clearInterval(timer);
  }, [call.startedAt]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const syncFromCall = useCallback(
    (next: CallSummary) => {
      setMessages(next.messages || []);
      setRecording(next.recording);
      setMutedAll(next.mutedAll);
      const self = next.participants.find((p) => p.userId === currentUserId);
      if (self) {
        setHandRaised(self.handRaised);
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    syncFromCall(call);
  }, [call, syncFromCall]);

  const syncSelfMedia = useCallback(
    (patch: { audio?: boolean; video?: boolean; screen?: boolean }) => {
      void apiSelfState(call.id, patch).catch(() => {});
    },
    [call.id],
  );

  const toggleHand = async () => {
    setHandRaised((v) => !v);
    try {
      await apiHandRaise(call.id);
    } catch {
      // ignore
    }
  };

  const handleAudioToggle = async () => {
    setBusy(true);
    try {
      const next = await toggleMic();
      if (next !== undefined) syncSelfMedia({ audio: next });
    } finally {
      setBusy(false);
    }
  };

  const handleVideoToggle = async () => {
    setBusy(true);
    try {
      const next = await toggleCam();
      syncSelfMedia({ video: next });
    } finally {
      setBusy(false);
    }
  };

  const handleScreenToggle = async () => {
    try {
      const started = await toggleScreen();
      if (started) syncSelfMedia({ screen: started });
      setMediaError(null);
    } catch {
      // user cancelled the picker
    }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    try {
      const { data } = await apiSendChat(call.id, text);
      if (!data) return;
      const msg: CallMessage = {
        id: data.id,
        userId: data.userId,
        name: data.name || "You",
        text,
        type: "text",
        createdAt: data.createdAt,
      };
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === msg.id);
        return existing ? prev : [...prev, msg];
      });
    } catch {
      // ignore
    }
  };

  const speakerCountTotal = Math.max(1, participants.length);
  const gridCols =
    speakerCountTotal <= 1
      ? "grid-cols-1"
      : speakerCountTotal <= 2
        ? "sm:grid-cols-2"
        : speakerCountTotal <= 4
          ? "sm:grid-cols-2"
          : speakerCountTotal <= 6
            ? "sm:grid-cols-3"
            : "sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div>
            <div className="text-sm font-semibold">{call.name || "Call"}</div>
            <div className="text-xs text-white/50">
              {call.status === "scheduled" ? "Scheduled" : "Live"} · {elapsed} ·{" "}
              {participants.length} participant{participants.length === 1 ? "" : "s"}
            </div>
          </div>
          {recording && (
            <span className="ml-2 flex items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              REC
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isModerator && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:bg-white/10"
              onClick={async () => {
                try {
                  await apiModerate(call.id, "record");
                } catch {
                  // ignore
                }
              }}
            >
              {recording ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">{recording ? "Stop" : "Record"}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:bg-white/10"
            onClick={() => setShowChat((v) => !v)}
          >
            <ChatIcon className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Chat</span>
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Participant grid */}
        <div className={cn("flex-1 min-w-0 overflow-y-auto p-4", showChat && "hidden md:block")}>
          {mediaError && (
            <div className="mb-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">
              {mediaError}
            </div>
          )}
          {participants.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-white/40">
              <div className="text-sm">Waiting for others to join…</div>
              <div className="mt-2 text-xs text-white/25">Share the link or invite members</div>
            </div>
          ) : (
            <div className={cn("grid gap-3", gridCols)}>
              {/* Local preview */}
              <div
                className={cn(
                  "relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border bg-slate-900",
                  "ring-1 ring-white/20",
                )}
              >
                {localStream && video ? (
                  <video
                    ref={localPreviewRef}
                    muted
                    autoPlay
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-emerald-600 text-lg">
                        {getInitials(selfName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                {!audio && (
                  <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90">
                    <MicOffIcon className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                  <span className="font-medium">You</span>
                </div>
              </div>

              {participants.map((p) => (
                <ParticipantTile
                  key={p.userId}
                  name={p.name}
                  video={p.video}
                  audio={p.audio}
                  handRaised={p.handRaised}
                  isSelf={false}
                  userStream={remoteStreams[p.userId]}
                  peerState={remoteStreams[p.userId] ? "connected" : "connecting"}
                  screen={p.screen}
                  isModerator={isModerator}
                  onMute={() => apiModerate(call.id, "mute", p.userId).catch(() => {})}
                />
              ))}
            </div>
          )}
        </div>

        {/* Side chat */}
        {showChat && (
          <div className="flex w-80 flex-col border-l border-white/10 bg-slate-900/60 md:flex">
            <div className="border-b border-white/10 px-3 py-2 text-sm font-medium">
              In-call chat
            </div>
            <ScrollArea className="flex-1 px-3 py-2">
              <div className="space-y-2">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-white/30">No messages yet</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className="text-sm">
                    <span className="font-semibold text-emerald-300">{m.name}: </span>
                    <span className="text-white/80">{m.text}</span>
                    <span className="ml-1 text-[10px] text-white/30">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <div className="flex gap-2 border-t border-white/10 p-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChat();
                }}
                placeholder="Type a message"
                className="w-full rounded-md bg-white/10 px-2.5 py-1.5 text-sm outline-none placeholder:text-white/30"
              />
              <Button size="sm" onClick={sendChat}>
                Send
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3">
        <ControlButton
          active={audio}
          icon={audio ? <MicIcon className="h-5 w-5" /> : <MicOffIcon className="h-5 w-5" />}
          label="Mute"
          danger={!audio}
          disabled={busy}
          onClick={handleAudioToggle}
        />
        {call.media !== "audio" && (
          <ControlButton
            active={video}
            icon={video ? <VideoIcon className="h-5 w-5" /> : <VideoOffIcon className="h-5 w-5" />}
            label="Camera"
            danger={!video}
            disabled={busy}
            onClick={handleVideoToggle}
          />
        )}
        <ControlButton
          active={screen}
          icon={<ScreenShareIcon className="h-5 w-5" />}
          label="Share"
          onClick={handleScreenToggle}
        />
        <ControlButton
          active={handRaised}
          icon={<HandIcon className="h-5 w-5" />}
          label="Hand"
          onClick={toggleHand}
          highlighted={handRaised}
        />
        {isModerator && (
          <ControlButton
            active={!mutedAll}
            icon={<SettingsIcon className="h-5 w-5" />}
            label="Mute all"
            onClick={() => apiModerate(call.id, "muteAll").catch(() => {})}
          />
        )}
        <div className="mx-2 h-8 w-px bg-white/10" />
        <Button
          variant="destructive"
          className="h-11 w-11 rounded-full p-0"
          title={isModerator ? "End call" : "Leave call"}
          onClick={async () => {
            if (isModerator) {
              await apiEnd(call.id).catch(() => {});
              onClosed?.();
            } else {
              await apiLeave(call.id).catch(() => {});
              onLeave?.();
            }
            leaveCall();
          }}
        >
          <PhoneOffIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function ControlButton({
  active,
  icon,
  label,
  danger,
  highlighted,
  disabled,
  onClick,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition",
        active === false || danger
          ? "bg-red-500 text-white hover:bg-red-400"
          : highlighted
            ? "bg-emerald-500 text-white hover:bg-emerald-400"
            : "bg-white/10 text-white hover:bg-white/20",
        disabled && "opacity-50",
      )}
    >
      {icon}
    </button>
  );
}

function ParticipantTile({
  name,
  video,
  audio,
  handRaised,
  screen,
  userStream,
  peerState,
  isSelf,
  isModerator,
  onMute,
}: {
  name: string;
  video: boolean;
  audio: boolean;
  handRaised: boolean;
  screen: boolean;
  userStream?: MediaStream | null;
  peerState?: string;
  isSelf?: boolean;
  isModerator: boolean;
  onMute: () => void;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border bg-slate-900",
        screen && "border-emerald-400",
        peerState === "failed" && "border-red-500/60",
        peerState === "reconnecting" && "border-amber-400/60",
      )}
    >
      {userStream && video ? (
        <TiledVideo stream={userStream} />
      ) : (
        // Fallback avatar tile while the stream is pending / muted.
        <div className="flex items-center justify-center">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-emerald-600 text-lg">{getInitials(name)}</AvatarFallback>
          </Avatar>
        </div>
      )}
      {screen && (
        <div className="absolute right-2 top-2 flex h-6 items-center gap-1 rounded-full bg-emerald-500/90 px-2 text-[11px] font-semibold text-black">
          <ScreenShareIcon className="h-3.5 w-3.5" /> Screen
        </div>
      )}
      {/* Hand raised badge */}
      {handRaised && (
        <div className="absolute left-2 top-2 flex h-6 items-center gap-1 rounded-full bg-yellow-400 px-2 text-xs font-semibold text-black">
          <HandIcon className="h-3.5 w-3.5" />
          Hand
        </div>
      )}
      {/* Muted badge */}
      {!audio && (
        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90">
          <MicOffIcon className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      {/* Mute others (moderator) */}
      {isModerator && (
        <button
          type="button"
          onClick={onMute}
          className="absolute bottom-2 right-2 hidden h-7 w-7 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 sm:flex"
          title="Force mute"
        >
          <MicOffIcon className="h-3.5 w-3.5 text-white/80" />
        </button>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
        <span className="font-medium">{name}</span>
        {peerState === "reconnecting" && <span className="text-amber-300">reconnecting…</span>}
        {peerState === "connecting" && <span className="text-white/60">connecting…</span>}
      </div>
    </div>
  );
}

function TiledVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    // biome-ignore lint/a11y/useMediaCaption: peer WebRTC streams have no caption source
    <video ref={ref} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
  );
}
