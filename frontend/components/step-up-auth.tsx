"use client";

import { useState } from "react";
import { ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, apiUrl } from "@/lib/api";

interface StepUpAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  action?: string;
  actionLabel?: string;
}

export default function StepUpAuth({ open, onOpenChange, onVerified, action, actionLabel }: StepUpAuthProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  async function handleVerify() {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch(apiUrl("/api/two-factor/step-up"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });
      const data = await res.json();

      if (data.success) {
        setVerified(true);
        setTimeout(() => {
          onVerified();
          onOpenChange(false);
          setVerified(false);
          setCode("");
        }, 1000);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-sm bg-amber-500/10 p-2">
              <ShieldAlert className="size-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle>Step-Up Authentication Required</DialogTitle>
              <DialogDescription>
                {actionLabel || "This action requires additional verification."}
                {" "}Enter a TOTP code from your authenticator app to continue.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {verified ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="size-10 text-green-500" />
            <p className="text-sm font-medium text-green-700">Verified</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-sm bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="step-up-code">Authentication Code</Label>
              <Input
                id="step-up-code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-widest h-12 font-mono"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={code.length !== 6 || loading}
            >
              {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Verify & Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
