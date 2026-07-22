"use client";

import { useState, useEffect } from "react";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2Icon, Loader2, SmartphoneIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { getSocketIO } from "@/lib/socketio-client";

type ConnectionStatus = "disconnected" | "initializing" | "qr" | "ready" | "authenticated" | "error";

interface ClientState {
  status: ConnectionStatus;
  qrCode?: string;
  phoneNumber?: string;
  error?: string;
  info?: { me: string; phone: string; platform: string };
}

export function WhatsAppFloat() {
  const [open, setOpen] = useState(false);
  const [clientState, setClientState] = useState<ClientState>({ status: "disconnected" });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const socket = getSocketIO();

    const handleStatus = (state: ClientState) => {
      setClientState(state);
    };

    socket.on("whatsapp:status", handleStatus);

    fetch("/api/whatsapp/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClientState(d.data);
      })
      .catch(() => {});

    return () => {
      socket.off("whatsapp:status", handleStatus);
    };
  }, [open]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (clientState.status === "initializing" || clientState.status === "qr") {
        fetch("/api/whatsapp/status")
          .then((r) => r.json())
          .then((d) => {
            if (d.success) setClientState(d.data);
          })
          .catch(() => {});
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [clientState.status]);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch("/api/whatsapp/start", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setClientState({ status: "error", error: data.error || "Failed to start client" });
      }
    } catch {
      setClientState({ status: "error", error: "Failed to start client" });
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    try {
      await fetch("/api/whatsapp/stop", { method: "POST" });
      setClientState({ status: "disconnected" });
    } catch {
      setClientState({ status: "error", error: "Failed to stop client" });
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/whatsapp/logout", { method: "POST" });
      setClientState({ status: "disconnected" });
    } catch {
      setClientState({ status: "error", error: "Failed to logout" });
    }
  }

  const StatusIcon = () => {
    switch (clientState.status) {
      case "ready":
        return <CheckCircle2Icon className="size-5 text-green-500" />;
      case "initializing":
      case "qr":
        return <Loader2 className="size-5 animate-spin text-amber-500" />;
      case "error":
        return <XCircleIcon className="size-5 text-destructive" />;
      default:
        return <SmartphoneIcon className="size-5 text-muted-foreground" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-sm bg-[#25D366] text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
        aria-label="Connect WhatsApp"
      >
        <WhatsAppIcon className="size-7" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Connect WhatsApp</DialogTitle>
            <DialogDescription>
              {clientState.status === "disconnected" &&
                "Start the client and scan the QR code with your phone."}
              {clientState.status === "initializing" &&
                "Initializing WhatsApp client..."}
              {clientState.status === "qr" &&
                "Scan the QR code with your phone's WhatsApp."}
              {clientState.status === "ready" &&
                `Connected as ${clientState.phoneNumber || "your account"}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {/* Disconnected state */}
            {clientState.status === "disconnected" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <SmartphoneIcon className="size-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Start the client and scan the QR code with your phone's WhatsApp
                  (Linked Devices → Link a Device).
                </p>
                <Button onClick={handleStart} disabled={starting} className="w-full">
                  {starting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Start & Show QR Code
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/settings">
                    <Settings2Icon className="mr-2 size-4" />
                    Settings
                  </a>
                </Button>
              </div>
            )}

            {/* Initializing state */}
            {clientState.status === "initializing" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="size-12 animate-spin text-amber-500" />
                <p className="text-sm text-muted-foreground">Initializing WhatsApp client...</p>
              </div>
            )}

            {/* QR code state */}
            {clientState.status === "qr" && clientState.qrCode && (
              <>
                <img src={clientState.qrCode} alt="QR Code" className="rounded-sm border" />
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Open WhatsApp on your phone → Linked Devices → Link a Device → Scan this QR code.
                </p>
                <p className="text-xs text-muted-foreground">
                  QR expires in 2 minutes — a new one will appear automatically.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleStop}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {/* Connected state */}
            {clientState.status === "ready" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2Icon className="size-16 text-green-500" />
                <div className="text-center">
                  <p className="text-sm font-medium">WhatsApp Connected</p>
                  {clientState.phoneNumber && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {clientState.phoneNumber}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleStop}>
                    Disconnect
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>
            )}

            {/* Error state */}
            {clientState.status === "error" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <XCircleIcon className="size-16 text-destructive" />
                <p className="text-sm text-destructive text-center max-w-xs">
                  {clientState.error || "Failed to connect."}
                </p>
                <Button size="sm" onClick={handleStart}>Retry</Button>
              </div>
            )}

            {/* Status indicator */}
            {clientState.status !== "disconnected" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <StatusIcon />
                <span>
                  {clientState.status === "ready" ? "Connected" :
                   clientState.status === "initializing" ? "Initializing..." :
                   clientState.status === "qr" ? "Awaiting scan" :
                   clientState.status === "error" ? "Error" : "Disconnected"}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
