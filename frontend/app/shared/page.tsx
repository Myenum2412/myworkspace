"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadIcon, UsersIcon } from "lucide-react";

interface SharedFile {
  id: string;
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  sharedByUserId: string;
  sharedByName: string;
  createdAt: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(createdAt: string | number) {
  const ts = typeof createdAt === "string" ? new Date(createdAt).getTime() : Number(createdAt);
  return new Date(ts || Date.now()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SharedPage() {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });

  useEffect(() => {
    fetch("/api/files/shared", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setFiles(Array.isArray(data) ? data : data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="size-6" />
            Shared with Me
          </h1>

          <Card>
            <CardHeader>
              <CardTitle>Shared Files</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files shared with you yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Type</th>
                        <th className="pb-3 pr-4 font-medium">Size</th>
                        <th className="pb-3 pr-4 font-medium">Shared By</th>
                        <th className="pb-3 pr-4 font-medium">Date</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{file.originalName}</td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline">
                              {file.mimeType.split("/").pop()?.toUpperCase() || "FILE"}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {formatSize(file.size)}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {file.sharedByName}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {formatDate(file.createdAt)}
                          </td>
                          <td className="py-3">
                            <a
                              href={`/api/files/${file.fileId}`}
                              download
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            >
                              <DownloadIcon className="size-4" />
                            </a>
                          </td>
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
