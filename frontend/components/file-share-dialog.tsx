"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Link2Icon, CopyIcon, UsersIcon, Loader2Icon, CheckCircle2Icon, XIcon,
} from "lucide-react";

interface FileShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  orgId: string;
}

export function FileShareDialog({ open, onOpenChange, fileId, orgId }: FileShareDialogProps) {
  const [tab, setTab] = useState<"link" | "internal">("link");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState("");
  const [maxDownloads, setMaxDownloads] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [internalUsers, setInternalUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [internalLinks, setInternalLinks] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadInternalShares();
      loadUsers();
    }
  }, [open, fileId]);

  const loadInternalShares = async () => {
    try {
      const res = await fetch(`/api/shares/internal?fileId=${fileId}&orgId=${orgId}`);
      const data = await res.json();
      setInternalLinks(data.data || []);
    } catch {}
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`/api/files/members?orgId=${orgId}`);
      const data = await res.json();
      setInternalUsers(data.data || []);
    } catch {}
  };

  const createLink = async () => {
    setLoading(true);
    try {
      const body: Record<string, any> = { fileId, orgId, isPublic: true, allowDownload };
      if (password) body.password = password;
      if (expiresIn) {
        const hours = parseInt(expiresIn);
        body.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }
      if (maxDownloads) body.maxDownloads = parseInt(maxDownloads);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/shares/links`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.shareUrl) setShareUrl(result.shareUrl);
    } catch {} finally {
      setLoading(false);
    }
  };

  const shareInternal = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await fetch("/api/shares/internal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileId, sharedWithUserId: selectedUser, orgId }),
      });
      setSelectedUser("");
      await loadInternalShares();
    } catch {} finally {
      setLoading(false);
    }
  };

  const removeInternal = async (shareId: string) => {
    try {
      await fetch("/api/shares/internal", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ id: shareId }),
      });
      await loadInternalShares();
    } catch {}
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>Create a share link or share with team members.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b pb-2">
          <button
            className={`px-3 py-1 text-sm rounded-md ${tab === "link" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setTab("link")}
          ><Link2Icon className="inline size-4 mr-1" /> Share Link</button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${tab === "internal" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setTab("internal")}
          ><UsersIcon className="inline size-4 mr-1" /> Internal</button>
        </div>

        {tab === "link" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
              <Label htmlFor="allow-dl">Allow download</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Password (optional)</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave empty for no password" className="mt-1" />
              </div>
              <div>
                <Label>Expires in (hours)</Label>
                <Input type="number" value={expiresIn} onChange={e => setExpiresIn(e.target.value)} placeholder="Never" className="mt-1" min="1" />
              </div>
            </div>
            <div>
              <Label>Max downloads</Label>
              <Input type="number" value={maxDownloads} onChange={e => setMaxDownloads(e.target.value)} placeholder="Unlimited" className="mt-1" min="1" />
            </div>

            {!shareUrl ? (
              <Button onClick={createLink} disabled={loading} className="w-full">
                {loading ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <Link2Icon className="mr-2 size-4" />}
                Generate Share Link
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                  <Input value={shareUrl} readOnly className="border-0 bg-transparent text-sm" />
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copied ? <CheckCircle2Icon className="size-4 text-success" /> : <CopyIcon className="size-4" />}
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShareUrl("")}>
                  Generate New Link
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "internal" && (
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded-md px-3 py-2 text-sm"
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
              >
                <option value="">Select a team member...</option>
                {internalUsers.map((u: any) => (
                  <option key={u.userId} value={u.userId}>{u.name} ({u.email})</option>
                ))}
              </select>
              <Button onClick={shareInternal} disabled={!selectedUser || loading} size="sm">
                Share
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Shared with</h4>
              {internalLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not shared with anyone yet</p>
              ) : (
                internalLinks.map((link: any) => (
                  <div key={link.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                    <span>{link.sharedWithUserId || "Organization"}</span>
                    <button onClick={() => removeInternal(link.id)} className="text-muted-foreground hover:text-destructive">
                      <XIcon className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
