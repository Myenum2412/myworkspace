"use client";

import { useState } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { formatSize } from "@/lib/file-system/types";
import { getFileIcon } from "@/components/files/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LinkIcon,
  CopyIcon,
  CheckIcon,
  UserPlusIcon,
  GlobeIcon,
  LockIcon,
  ClockIcon,
} from "lucide-react";
import * as api from "@/lib/file-system/api";

export function ShareDialog() {
  const { shareFile: file, setShareFile, orgId } = useFileSystemStore();
  const [activeTab, setActiveTab] = useState("link");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxDownloads, setMaxDownloads] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("view");
  const [creating, setCreating] = useState(false);

  if (!file) return null;

  async function handleCreateLink() {
    if (!file) return;
    setCreating(true);
    try {
      const data: Parameters<typeof api.createShareLink>[0] = {
        fileId: file.id,
        isPublic,
        allowDownload,
      };
      if (password) data.password = password;
      if (expiresAt) data.expiresAt = new Date(expiresAt).toISOString();
      if (maxDownloads) data.maxDownloads = parseInt(maxDownloads);
      const result = await api.createShareLink(data);
      setShareLink(`${window.location.origin}/share/${result.token}`);
    } catch (e) {
      console.error("Failed to create share link", e);
    } finally {
      setCreating(false);
    }
  }

  async function handleInternalShare() {
    if (!shareEmail || !file) return;
    try {
      await api.createInternalShare({
        fileId: file.id,
        sharedWithUserId: shareEmail,
        permission: sharePermission,
        orgId,
      });
      setShareEmail("");
    } catch (e) {
      console.error("Failed to share", e);
    }
  }

  async function copyLink() {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o) setShareFile(null); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getFileIcon(file.mimeType)}
            <div className="min-w-0">
              <DialogTitle className="text-base truncate">{file.originalName}</DialogTitle>
              <DialogDescription>{formatSize(file.size)}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link"><LinkIcon className="size-3.5 mr-1.5" /> Share Link</TabsTrigger>
            <TabsTrigger value="internal"><UserPlusIcon className="size-3.5 mr-1.5" /> Share with People</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GlobeIcon className="size-4 text-muted-foreground" />
                <span className="text-sm">Public link</span>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DownloadIcon className="size-4 text-muted-foreground" />
                <span className="text-sm">Allow download</span>
              </div>
              <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Password (optional)</Label>
              <Input
                type="password"
                placeholder="Leave empty for no password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Expires at (optional)</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Max downloads (optional)</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={maxDownloads}
                  onChange={(e) => setMaxDownloads(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleCreateLink} disabled={creating} className="w-full">
              <LinkIcon className="size-3.5 mr-1.5" />
              {creating ? "Creating..." : "Generate Share Link"}
            </Button>

            {shareLink && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <Input value={shareLink} readOnly className="text-xs h-8 bg-transparent border-0" />
                <Button variant="ghost" size="sm" onClick={copyLink} className="h-8 shrink-0">
                  {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="internal" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs">Share with (email or user ID)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="user@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
                <Select value={sharePermission} onValueChange={setSharePermission}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View only</SelectItem>
                    <SelectItem value="download">Download</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                    <SelectItem value="full">Full access</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleInternalShare}>
                  <UserPlusIcon className="size-3.5 mr-1" /> Share
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => setShareFile(null)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DownloadIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
