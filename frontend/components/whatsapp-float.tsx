"use client";

import { useState, useEffect, useRef } from "react";
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
import { Settings2Icon, ScanQrCodeIcon, Loader2, SmartphoneIcon, CheckCircle2Icon, XCircleIcon, KeyRoundIcon } from "lucide-react";
import { getSocketIO } from "@/lib/socketio-client";

type ConnectionStatus = "disconnected" | "connecting" | "qr" | "pairing_code" | "connected" | "error";

interface ClientState {
  status: ConnectionStatus;
  qrCode?: string;
  pairingCode?: string;
  phoneNumber?: string;
  error?: string;
  autoReply?: boolean;
}

export function WhatsAppFloat() {
  const [open, setOpen] = useState(false);
  const [clientState, setClientState] = useState<ClientState>({ status: "disconnected" });
  const [starting, setStarting] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [showPairInput, setShowPairInput] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;

    const socket = getSocketIO();

    const handleStatus = (state: ClientState) => {
      setClientState(state);
    };

    socket.on("whatsapp:status", handleStatus);

    fetch("/api/whatsapp-local/status")
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
    if (clientState.status === "qr" && clientState.qrCode && canvasRef.current) {
      import("qrcode").then((mod) => {
        mod.toCanvas(canvasRef.current, clientState.qrCode!, {
          width: 280,
          margin: 2,
          color: { dark: "#1a1a1a", light: "#ffffff" },
        });
      });
    }
  }, [clientState.status, clientState.qrCode]);

  async function handleStart() {
    setStarting(true);
    setShowPairInput(false);
    try {
      await fetch("/api/whatsapp-local/start", { method: "POST" });
    } catch {
      setClientState({ status: "error", error: "Failed to start client" });
    } finally {
      setStarting(false);
    }
  }

  async function handlePair() {
    if (!phoneInput.trim()) return;
    setStarting(true);
    try {
      const res = await fetch("/api/whatsapp-local/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneInput.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setClientState({ status: "error", error: data.error || "Pairing failed" });
      }
    } catch {
      setClientState({ status: "error", error: "Failed to request pairing code" });
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    await fetch("/api/whatsapp-local/stop", { method: "POST" });
    setClientState({ status: "disconnected" });
  }

  async function handleLogout() {
    await fetch("/api/whatsapp-local/logout", { method: "POST" });
    setClientState({ status: "disconnected" });
  }

  async function toggleAutoReply() {
    const enabled = !clientState.autoReply;
    const res = await fetch("/api/whatsapp-local/auto-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    if (data.success) setClientState((prev) => ({ ...prev, autoReply: enabled }));
  }

  const StatusIcon = () => {
    switch (clientState.status) {
      case "connected":
        return <CheckCircle2Icon className="size-5 text-green-500" />;
      case "connecting":
      case "qr":
      case "pairing_code":
        return <Loader2 className="size-5 animate-spin text-amber-500" />;
      case "error":
        return <XCircleIcon className="size-5 text-red-500" />;
      default:
        return <SmartphoneIcon className="size-5 text-muted-foreground" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
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
                "Scan the QR code or use a pairing code to link your WhatsApp."}
              {clientState.status === "qr" &&
                "Scan the QR code with your phone's WhatsApp."}
              {clientState.status === "pairing_code" &&
                "Enter the pairing code in WhatsApp on your phone."}
              {clientState.status === "connected" &&
                `Connected as ${clientState.phoneNumber || "your account"}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {/* Disconnected state */}
            {clientState.status === "disconnected" && !showPairInput && (
              <div className="flex flex-col items-center gap-4 py-4">
                <ScanQrCodeIcon className="size-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Start the client and scan the QR code with your phone's WhatsApp
                  (Linked Devices → Link a Device).
                </p>
                <Button onClick={handleStart} disabled={starting} className="w-full">
                  {starting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Start & Show QR Code
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowPairInput(true)} className="gap-2">
                  <KeyRoundIcon className="size-4" />
                  Use pairing code instead
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/settings">
                    <Settings2Icon className="mr-2 size-4" />
                    Settings
                  </a>
                </Button>
              </div>
            )}

            {/* Pairing code input */}
            {clientState.status === "disconnected" && showPairInput && (
              <div className="flex flex-col items-center gap-4 py-4 w-full">
                <KeyRoundIcon className="size-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Enter your phone number with country code (e.g., 911234567890 for India).
                  A pairing code will appear — enter it in WhatsApp → Linked Devices → Link a Device.
                </p>
                <div className="grid gap-2 w-full max-w-xs">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="911234567890"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                  />
                </div>
                <Button onClick={handlePair} disabled={starting || !phoneInput.trim()} className="w-full max-w-xs">
                  {starting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Request Pairing Code
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowPairInput(false)}>
                  Back to QR code
                </Button>
              </div>
            )}

            {/* Connecting state */}
            {clientState.status === "connecting" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="size-12 animate-spin text-amber-500" />
                <p className="text-sm text-muted-foreground">Connecting to WhatsApp...</p>
              </div>
            )}

            {/* QR code state */}
            {clientState.status === "qr" && (
              <>
                <canvas ref={canvasRef} className="rounded-lg border" />
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

            {/* Pairing code state */}
            {clientState.status === "pairing_code" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <KeyRoundIcon className="size-12 text-amber-500" />
                <div className="bg-muted rounded-lg px-8 py-4">
                  <p className="text-3xl font-mono font-bold tracking-widest text-center">
                    {clientState.pairingCode}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Open WhatsApp on your phone → Linked Devices → Link a Device →
                  enter this code.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleStop}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Connected state */}
            {clientState.status === "connected" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2Icon className="size-16 text-green-500" />
                <div className="text-center">
                  <p className="text-sm font-medium">WhatsApp Connected</p>
                  {clientState.phoneNumber && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {clientState.phoneNumber}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Messages will be processed by the Hermes Agent.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    variant={clientState.autoReply ? "default" : "secondary"}
                    size="sm"
                    onClick={toggleAutoReply}
                    className="w-full max-w-[200px]"
                  >
                    {clientState.autoReply ? "Auto-Reply ON" : "Auto-Reply OFF"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Disconnect & Logout
                  </Button>
                </div>
              </div>
            )}

            {/* Error state */}
            {clientState.status === "error" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <XCircleIcon className="size-16 text-red-500" />
                <p className="text-sm text-red-500 text-center max-w-xs">
                  {clientState.error || "Failed to connect."}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleStart}>Retry with QR</Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowPairInput(true); setClientState({ status: "disconnected" }); }}>
                    Try Pairing Code
                  </Button>
                </div>
              </div>
            )}

            {/* Status indicator */}
            {clientState.status !== "disconnected" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <StatusIcon />
                <span>
                  {clientState.status === "connected" ? "Connected" :
                   clientState.status === "connecting" ? "Connecting..." :
                   clientState.status === "qr" ? "Awaiting scan" :
                   clientState.status === "pairing_code" ? "Code generated" :
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
