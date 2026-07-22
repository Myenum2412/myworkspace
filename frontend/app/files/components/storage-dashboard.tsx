"use client";

import { useState, useEffect } from "react";
import { HardDrive, Upload, Download, FileText, AlertTriangle, RefreshCw } from "lucide-react";

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
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-sm w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-sm" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={fetchStats} className="mt-2 text-sm text-indigo-600 hover:underline">Retry</button>
      </div>
    );
  }

  if (!stats) return null;

  const quotaPct = getQuotaPercentage();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Storage Usage</h2>
        <button onClick={fetchStats} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-sm">
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-sm border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Storage Quota</span>
          <span className="text-xs text-gray-400">{quotaPct.toFixed(1)}% used</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-sm overflow-hidden">
          <div className={`h-full rounded-sm transition-all duration-500 ${getQuotaColor()}`} style={{ width: `${quotaPct}%` }} />
        </div>
      </div>

      {Object.keys(stats.byType).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-sm border p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">By File Type</h3>
          <div className="space-y-2">
            {Object.entries(stats.byType).sort((a, b) => b[1].size - a[1].size).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 capitalize">{type}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{data.count} files</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{formatBytes(data.size)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
