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

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

export function WhatsAppFloat() {
  const [open, setOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/qr-code", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate QR code");
      const data = await res.json();
      setQrImageUrl(data.qrImageUrl);
    } catch {
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
              Scan this QR code with your WhatsApp to connect it to this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {loading ? (
              <div className="flex size-[300px] items-center justify-center text-sm text-muted-foreground">
                Generating QR code...
              </div>
            ) : qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="WhatsApp QR Code"
                className="rounded-lg border"
                width={300}
                height={300}
              />
            ) : (
              <div className="flex size-[300px] items-center justify-center text-sm text-red-500">
                Failed to generate QR code. Please try again.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
