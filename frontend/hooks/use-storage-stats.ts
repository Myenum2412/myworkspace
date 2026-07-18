"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  extensionStats: Array<{
    ext: string;
    count: number;
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

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/files/storage-stats?orgId=${orgId}`, { credentials: "include", signal });
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
    const controller = new AbortController();
    fetchStats(controller.signal);
    return () => controller.abort();
  }, [fetchStats]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!orgId) return;
    const controller = new AbortController();
    const interval = setInterval(() => fetchStats(controller.signal), 15_000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [orgId, fetchStats]);

  // Refresh on window focus
  useEffect(() => {
    const controller = new AbortController();
    const handler = () => fetchStats(controller.signal);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener("focus", handler);
      controller.abort();
    };
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
