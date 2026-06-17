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
import { Trash2Icon, DownloadIcon, Share2Icon } from "lucide-react";
import { deleteFileAction, shareFileAction } from "@/actions/files";

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });

  const fetchFiles = async () => {
    const res = await fetch("/api/files");
    if (res.ok) {
      setFiles(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  const handleDelete = async (fileId: string) => {
    await deleteFileAction(fileId);
    fetchFiles();
  };

  const handleShare = async (fileId: string) => {
    await shareFileAction(fileId, null);
    fetchFiles();
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">All Files</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Type</th>
                        <th className="pb-3 pr-4 font-medium">Size</th>
                        <th className="pb-3 pr-4 font-medium">Uploaded</th>
                        <th className="pb-3 pr-4 font-medium">By</th>
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
                            {formatDate(Number(file.createdAt))}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {file.uploaderName}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <a
                                href={`/api/files/${file.id}`}
                                className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              >
                                <DownloadIcon className="size-4" />
                              </a>
                              <button
                                onClick={() => handleShare(file.id)}
                                className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              >
                                <Share2Icon className="size-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(file.id)}
                                className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              >
                                <Trash2Icon className="size-4" />
                              </button>
                            </div>
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
