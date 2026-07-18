"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircleIcon, FileText } from "lucide-react";

type RecentFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  category: string;
  createdAt: string;
};

type WorkspaceStats = {
  folderCount: number;
  fileCount: number;
  recentFiles: RecentFile[];
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [billing, setBilling] = useState<{ pendingCount: number; totalDue: number } | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("client_token") || "";
    if (!token) { router.push("/client/login"); return; }

    const opts = { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal };

    Promise.all([
      fetch("/api/client-auth/me", opts).then(r => r.json()),
      fetch("/api/client-auth/billing-status", opts).then(r => r.json()),
      fetch("/api/client-auth/workspace-stats", opts).then(r => r.json()),
    ])
      .then(([me, bill, stats]) => {
        if (me.success) setName(me.data?.user?.name || "");
        if (bill.success) setBilling(bill.data);
        if (stats.success && stats.data?.recentFiles) setRecentFiles(stats.data.recentFiles);
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Welcome{name ? `, ${name}` : ""}. {getGreeting()}!
      </h1>

      {billing && billing.pendingCount > 0 && (
        <div className="w-full flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
          <AlertCircleIcon className="size-6 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900 text-base">
              ₹{(billing.totalDue / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} pending
            </p>
            <p className="text-sm text-amber-700">
              {billing.pendingCount} invoice{billing.pendingCount > 1 ? "s" : ""} due
            </p>
          </div>
          <Button asChild className="shrink-0 bg-amber-700 hover:bg-amber-800 text-white">
            <a href="/client/bills">Pay Now</a>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Files</CardTitle>
        </CardHeader>
        <CardContent>
          {recentFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files yet.</p>
          ) : (
            <div className="space-y-2">
              {recentFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4 capitalize">{f.category}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
