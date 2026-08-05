"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw } from "@/lib/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StorageStats {
  totalSize: number;
  fileCount: number;
  byType: Record<string, { count: number; size: number }>;
  quotaUsed: number;
  quotaLimit: number;
}

export function StorageDashboard({ orgId }: { orgId: string }) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/files/analytics/stats?orgId=${orgId}`);
      const data = await res.json();
      setStats(data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, [orgId]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getQuotaPercentage = () => {
    if (!stats || !stats.quotaLimit) return 0;
    return Math.min(100, (stats.quotaUsed / stats.quotaLimit) * 100);
  };

  const getQuotaColor = () => {
    const pct = getQuotaPercentage();
    if (pct > 90) return "bg-red-500";
    if (pct > 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded-lg w-1/4" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-destructive">{error}</p>
        <button onClick={fetchStats} className="mt-2 text-sm text-primary hover:underline">Retry</button>
      </div>
    );
  }

  if (!stats) return null;

  const quotaPct = getQuotaPercentage();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Storage Usage</h2>
        <button onClick={fetchStats} className="p-1 text-muted-foreground hover:bg-muted rounded-lg">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storage Quota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{formatBytes(stats.quotaUsed)} of {formatBytes(stats.quotaLimit)}</span>
            <span className="text-xs text-muted-foreground">{quotaPct.toFixed(1)}% used</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${getQuotaColor()}`} style={{ width: `${quotaPct}%` }} />
          </div>
        </CardContent>
      </Card>

      {Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By File Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byType).sort((a, b) => b[1].size - a[1].size).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">{type}</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">{data.count} files</span>
                  <span className="text-foreground font-medium">{formatBytes(data.size)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}