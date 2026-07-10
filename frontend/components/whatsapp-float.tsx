"use client";

import { useState } from "react";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings2Icon, ScanQrCodeIcon } from "lucide-react";

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

export function WhatsAppFloat() {
  const [open, setOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/qr-code", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate QR code");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setQrImageUrl(null);
      } else {
        setQrImageUrl(data.qrImageUrl);
        setQrData(data.qrData);
      }
    } catch {
      setError("Failed to generate QR code. Please try again.");
      setQrImageUrl(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
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
              Scan the QR code with your phone camera to start a chat with this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4">
            {loading ? (
              <div className="flex size-[300px] items-center justify-center text-sm text-muted-foreground">
                Generating QR code...
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <ScanQrCodeIcon className="size-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  No WhatsApp number is configured for this workspace.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/settings">
                    <Settings2Icon className="mr-2 size-4" />
                    Go to Settings
                  </a>
                </Button>
              </div>
            ) : qrImageUrl ? (
              <>
                <img
                  src={qrImageUrl}
                  alt="WhatsApp QR Code"
                  className="rounded-lg border"
                  width={300}
                  height={300}
                />
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Open your phone camera and point it at the QR code to open a WhatsApp chat.
                </p>
              </>
            ) : (
              <div className="flex size-[300px] items-center justify-center text-sm text-red-500">
                Failed to generate QR code.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
