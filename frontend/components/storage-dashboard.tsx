"use client";

import { useStorageStats, type StorageStats } from "@/hooks/use-storage-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  HardDrive, FileText, Image, Video, Music, Archive, Files,
  TrendingUp, Clock, AlertTriangle, CheckCircle2, Upload,
} from "lucide-react";

const USER_STORAGE_LIMIT = 1024 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

function getStorageColor(percent: number): string {
  if (percent >= 90) return "text-red-500";
  if (percent >= 70) return "text-amber-500";
  return "text-green-500";
}

function getStorageBarColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-green-500";
}

const categoryIcons: Record<string, typeof FileText> = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  archive: Archive,
  general: Files,
};

const categoryColors: Record<string, string> = {
  image: "#3b82f6",
  video: "#8b5cf6",
  audio: "#f59e0b",
  document: "#10b981",
  archive: "#ef4444",
  general: "#6b7280",
};

export function StorageDashboard({ orgId }: { orgId: string }) {
  const { stats, loading, error } = useStorageStats(orgId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Failed to load storage stats</p>
      </div>
    );
  }

  const pieData = [
    { name: "Used", value: stats.usedStorage },
    { name: "Available", value: stats.availableStorage },
  ];
  const pieColors = [getStorageBarColor(stats.usagePercent).replace("bg-", "#") === "#22c55e" ? "#22c55e" : getStorageBarColor(stats.usagePercent).replace("bg-", "#") === "#f59e0b" ? "#f59e0b" : "#ef4444", "#e5e7eb"];

  // Fix pie colors based on usage
  if (stats.usagePercent >= 90) pieColors[0] = "#ef4444";
  else if (stats.usagePercent >= 70) pieColors[0] = "#f59e0b";
  else pieColors[0] = "#22c55e";

  return (
    <div className="space-y-4">
      {/* Storage Warning Banners */}
      {stats.usagePercent >= 100 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Storage Full</p>
            <p className="text-xs">You have reached your 1 GB storage limit. Please delete files to free up space.</p>
          </div>
        </div>
      )}
      {stats.usagePercent >= 80 && stats.usagePercent < 100 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Storage Running Low</p>
            <p className="text-xs">You have used {stats.usagePercent.toFixed(1)}% of your 1 GB storage. Consider deleting unused files.</p>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {/* Donut Chart Card */}
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="size-4" /> Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatBytes(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getStorageColor(stats.usagePercent)}`}>
                    {stats.usagePercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Used</p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium">{formatBytes(stats.usedStorage)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium">{formatBytes(stats.availableStorage)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{formatBytes(stats.totalStorage)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        <div className="col-span-2 grid gap-4 grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Files className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalFiles}</p>
                  <p className="text-xs text-muted-foreground">Total Files</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <TrendingUp className="size-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatBytes(stats.averageFileSize)}</p>
                  <p className="text-xs text-muted-foreground">Avg File Size</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Upload className="size-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{timeAgo(stats.lastUpload)}</p>
                  <p className="text-xs text-muted-foreground">Last Upload</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.deletedFiles}</p>
                  <p className="text-xs text-muted-foreground">Files Deleted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Storage Progress</span>
              <span className="text-muted-foreground">
                {formatBytes(stats.usedStorage)} / {formatBytes(stats.totalStorage)}
              </span>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getStorageBarColor(stats.usagePercent)}`}
                style={{ width: `${Math.min(100, stats.usagePercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>70%</span>
              <span>90%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Type Breakdown */}
      {stats.fileTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">File Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.fileTypes.map((ft) => {
              const Icon = categoryIcons[ft.category] || Files;
              return (
                <div key={ft.category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{ft.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{ft.count} files</span>
                      <span className="text-sm font-medium">{formatBytes(ft.size)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${ft.percent}%`, backgroundColor: categoryColors[ft.category] || "#6b7280" }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Largest File */}
      {stats.largestFile && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Largest File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{stats.largestFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.largestFile.mimeType} • {timeAgo(stats.largestFile.uploadedAt)}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 ml-2">
                {formatBytes(stats.largestFile.size)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Uploads */}
      {stats.recentUploads.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentUploads.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(f.uploadedAt)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatBytes(f.size)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
