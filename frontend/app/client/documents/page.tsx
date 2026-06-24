"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, FolderOpen, Loader2 } from "lucide-react";

type FileItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  category: string;
  createdAt: string;
};

export default function ClientDocumentsPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("client_token");
    if (!token) {
      router.push("/client/login");
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/client-auth/workspace-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.recentFiles) {
          setFiles(d.data.recentFiles.map((f: any) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            size: f.size,
            category: f.category,
            createdAt: f.createdAt,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => router.push("/client/dashboard")}>
          <ArrowLeft className="size-4 mr-1" /> Back to Dashboard
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <FolderOpen className="size-5 text-primary" />
              </div>
              <CardTitle>Documents & Files</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <p className="text-muted-foreground text-sm">No files yet.</p>
            ) : (
              <div className="space-y-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{f.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{f.category}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
