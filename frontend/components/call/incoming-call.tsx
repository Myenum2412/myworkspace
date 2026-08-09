"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiJoin, apiLeave } from "@/lib/call-api";
import { PhoneIcon, PhoneOffIcon } from "@/lib/icons";
import type { IncomingCall } from "@/lib/use-realtime";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function IncomingCallCard({
  incoming,
  onClose,
  onJoin,
}: {
  incoming: IncomingCall;
  onClose: () => void;
  onJoin: (callId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const { call, by } = incoming;

  const accept = async () => {
    setBusy(true);
    try {
      const { data } = await apiJoin(call.id);
      onJoin(call.id);
      onClose();
      void data;
    } catch {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      await apiLeave(call.id);
    } catch {
      // ignore
    } finally {
      onClose();
      setBusy(false);
    }
  };

  return (
    <div className="fixed right-4 top-4 z-[130] w-80 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
      <div className="flex items-center gap-3 p-4">
        <div className="relative">
          <Avatar className="h-12 w-12 ring-2 ring-emerald-400/60">
            <AvatarImage src="" />
            <AvatarFallback className="bg-emerald-600">
              {getInitials(by?.name || call.name || "Caller")}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-white">
            {by?.name || call.name || "Incoming call"}
          </div>
          <div className="flex items-center gap-1 text-sm text-white/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Incoming call
            {call.name ? ` · ${call.name}` : ""}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-around border-t border-white/10 p-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="h-12 w-12 rounded-full text-red-300 hover:bg-red-500/10"
          onClick={decline}
          title="Decline"
        >
          <PhoneOffIcon className="h-5 w-5" />
        </Button>
        <Button
          size="sm"
          disabled={busy}
          className="h-11 rounded-full bg-emerald-500 px-4 text-white hover:bg-emerald-400"
          onClick={accept}
          title="Accept"
        >
          <PhoneIcon className="h-4 w-4" />
          <span className="ml-1.5">Join</span>
        </Button>
      </div>
    </div>
  );
}
