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

  useEffect(() => {
    fetch("/api/files")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setFiles(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  const reloadFiles = () => {
    fetch("/api/files")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFiles(data))
      .catch(() => {});
  };

  const handleDelete = async (fileId: string) => {
    await deleteFileAction(fileId);
    reloadFiles();
  };

  const handleShare = async (fileId: string) => {
    await shareFileAction(fileId, null);
    reloadFiles();
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

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
