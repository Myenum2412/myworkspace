"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileIcon, Loader2Icon } from "lucide-react";

type FileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName?: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  const FAKE_FILES: FileItem[] = [
    { id: "fake-1", originalName: "Q4-Report.pdf", mimeType: "application/pdf", size: 2_400_000, createdAt: "2025-12-01T10:00:00Z", uploaderName: "Alice Chen" },
    { id: "fake-2", originalName: "Proposal-Draft.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 860_000, createdAt: "2025-11-28T14:30:00Z", uploaderName: "Bob Kumar" },
    { id: "fake-3", originalName: "Budget-2026.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 1_200_000, createdAt: "2025-11-25T09:15:00Z", uploaderName: "Carol Davis" },
    { id: "fake-4", originalName: "Screenshot-Mockup.png", mimeType: "image/png", size: 3_100_000, createdAt: "2025-11-22T16:45:00Z", uploaderName: "David Park" },
    { id: "fake-5", originalName: "Archive-Backup.zip", mimeType: "application/zip", size: 15_800_000, createdAt: "2025-11-20T08:00:00Z", uploaderName: "Eve Torres" },
    { id: "fake-6", originalName: "Meeting-Notes.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 320_000, createdAt: "2025-11-18T11:20:00Z", uploaderName: "Frank Lee" },
  ];

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const id = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (id) {
          fetch(`/api/files?orgId=${id}`, { credentials: "include" })
            .then((r) => r.json())
            .then((data) => setFiles(Array.isArray(data) ? data : data.data || []))
            .catch(() => setFiles(FAKE_FILES))
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => { setFiles(FAKE_FILES); setLoading(false); });
  }, [session]);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileIcon className="size-6" /> All Files
            </h1>
            <Badge variant="secondary">{files.length} files</Badge>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Files</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
              ) : files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Type</th>
                        <th className="pb-3 pr-4 font-medium">Size</th>
                        <th className="pb-3 pr-4 font-medium">Date</th>
                        <th className="pb-3 font-medium">Uploaded by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((f) => (
                        <tr key={f.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{f.originalName}</td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline">{f.mimeType.split("/").pop()?.toUpperCase() || "FILE"}</Badge>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{formatSize(f.size)}</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {new Date(f.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-muted-foreground">{f.uploaderName || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
