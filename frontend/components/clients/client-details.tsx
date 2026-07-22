"use client"
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Copy, Eye, EyeOff } from "lucide-react";
import type { Credentials } from "@/components/clients/client-types";

type ClientSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: Credentials | null;
};

export function ClientSuccessDialog({ open, onOpenChange, credentials }: ClientSuccessDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState("");

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-6 text-primary" />
            Client Created Successfully
          </DialogTitle>
          <DialogDescription>
            A welcome email has been sent to {credentials?.email}. Share these credentials with the client.
          </DialogDescription>
        </DialogHeader>

        {credentials && (
          <div className="space-y-4">
            <div className="rounded-sm border bg-muted/30 p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Login URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 rounded-sm bg-muted px-2 py-1 text-sm break-all">{credentials.loginUrl}</code>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => copyToClipboard(credentials.loginUrl, "url")}>
                    <Copy className="size-4" />
                  </Button>
                </div>
                {copied === "url" && <span className="text-xs text-red-500 mt-1 block">Copied!</span>}
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-muted-foreground">Username / Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 rounded-sm bg-muted px-2 py-1 text-sm">{credentials.email}</code>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => copyToClipboard(credentials.email, "email")}>
                    <Copy className="size-4" />
                  </Button>
                </div>
                {copied === "email" && <span className="text-xs text-red-500 mt-1 block">Copied!</span>}
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 rounded-sm bg-muted px-2 py-1 text-sm">
                    {showPassword ? credentials.password : "••••••••••••"}
                  </code>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => copyToClipboard(credentials.password, "password")}>
                    <Copy className="size-4" />
                  </Button>
                </div>
                {copied === "password" && <span className="text-xs text-red-500 mt-1 block">Copied!</span>}
              </div>
            </div>

            <div className="rounded-sm bg-gray-100 border-border p-3">
              <p className="text-xs text-gray-700">
                <strong>Note:</strong> The client will be required to change this password on first login.
                An email with these credentials has been sent to {credentials.email}.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
