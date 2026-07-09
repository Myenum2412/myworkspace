"use client";

import { useState, useEffect, useCallback } from "react";

export interface StorageStats {
  usedStorage: number;
  totalStorage: number;
  availableStorage: number;
  usagePercent: number;
  totalFiles: number;
  deletedFiles: number;
  deletedStorage: number;
  averageFileSize: number;
  largestFile: {
    name: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  } | null;
  lastUpload: string | null;
  fileTypes: Array<{
    category: string;
    label: string;
    count: number;
    size: number;
    percent: number;
  }>;
  recentUploads: Array<{
    id: string;
    name: string;
    size: number;
    mimeType: string;
    category: string;
    uploadedAt: string;
  }>;
  monthlyStats: Array<{
    month: string;
    count: number;
    size: number;
  }>;
}

export function useStorageStats(orgId?: string) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/files/storage-stats?orgId=${orgId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch storage stats");
      const data = await res.json();
      setStats(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!orgId) return;
    const interval = setInterval(fetchStats, 15_000);
    return () => clearInterval(interval);
  }, [orgId, fetchStats]);

  // Refresh on window focus
  useEffect(() => {
    const handler = () => fetchStats();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
