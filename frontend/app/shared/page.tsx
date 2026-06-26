"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DownloadIcon, UsersIcon, FileIcon, Loader2Icon, ImageIcon, FileTextIcon, ArchiveIcon } from "lucide-react";

interface SharedFile {
  id: string;
  fileId: string;
  sharedByUserId: string;
  sharedByName: string;
  createdAt: string;
  file?: { originalName: string; mimeType: string; size: number };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="size-5 text-red-500" />;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return <FileTextIcon className="size-5 text-red-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar")) return <ArchiveIcon className="size-5 text-orange-400" />;
  return <FileIcon className="size-5 text-muted-foreground" />;
}

export default function SharedPage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"shared-with-me" | "shared-by-me">("shared-with-me");

  useEffect(() => {
    async function load() {
      try {
        const profileRes = await fetch("/api/user/profile", { credentials: "include" });
        const profileData = await profileRes.json();
        const profile = profileData.data || profileData;
        const orgId = profile?.org?.id || profile?.org?._id?.toString() || "";
        const userId = session?.user?.id;

        if (orgId && userId) {
          const [sharedWithRes, sharedByRes] = await Promise.all([
            fetch(`/api/shares/internal?userId=${userId}`, { credentials: "include" }),
            fetch(`/api/shares/internal?orgId=${orgId}`, { credentials: "include" }),
          ]);
          const sharedWith = await sharedWithRes.json();
          const sharedBy = await sharedByRes.json();
          setFiles([...(sharedWith.data || []), ...(sharedBy.data || [])]);
        }
      } catch (error) {
        console.error("[SHARED] Failed to load:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Shared Files</h1>
        <Badge variant="secondary">{files.length} shared</Badge>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <button
          className={`px-3 py-1 text-sm rounded-md ${tab === "shared-with-me" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          onClick={() => setTab("shared-with-me")}
        >Shared with Me</button>
        <button
          className={`px-3 py-1 text-sm rounded-md ${tab === "shared-by-me" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          onClick={() => setTab("shared-by-me")}
        >Shared by Me</button>
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <UsersIcon className="size-16 mb-3" />
          <p className="text-lg font-medium">No shared files</p>
          <p className="text-sm">Share files from the File Manager to see them here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((share) => (
            <Card key={share.id} className="hover:border-muted-foreground/30 transition-colors">
              <CardContent className="flex items-center gap-4 p-4">
                {share.file ? getFileIcon(share.file.mimeType) : <FileIcon className="size-5 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{share.file?.originalName || "Unknown file"}</p>
                  <p className="text-xs text-muted-foreground">
                    Shared by {share.sharedByName || "Unknown"} · {new Date(share.createdAt).toLocaleDateString()}
                    {share.file?.size ? ` · ${formatSize(share.file.size)}` : ""}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(`/api/files/${share.fileId}?download=true`, "_blank")}>
                  <DownloadIcon className="mr-1 size-4" /> Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
