"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { FileExplorer } from "@/components/file-explorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2Icon, HardDriveIcon, FileIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";

function formatSizeMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export default function FilesPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const profileRes = await fetch("/api/user/profile", { credentials: "include" });
        const profileData = await profileRes.json();
        const p = profileData.data || profileData;
        setProfile(p);

        const orgId = p?.org?.id || p?.org?._id?.toString() || "";
        if (orgId) {
          const statsRes = await fetch(`/api/files/stats`, { credentials: "include" });
          const statsData = await statsRes.json();
          setStats(statsData.data || null);
        }
      } catch (error) {
        console.error("[FILES] Failed to load:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const orgId = profile?.org?.id || profile?.org?._id?.toString() || "";
  const userId = session?.user?.id || "";

  return (
    <div className="space-y-6">
      {/* Storage Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <HardDriveIcon className="size-4" /> Total Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatSizeMB(stats.totalSize || stats.totalSizeBytes || 0)} MB</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileIcon className="size-4" /> Total Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalFiles || 0}</p>
            </CardContent>
          </Card>
          <Link href="/recycle-bin">
            <Card className="hover:border-muted-foreground/30 cursor-pointer transition-colors h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trash2Icon className="size-4" /> Deleted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.deletedFiles || 0}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* File Explorer */}
      {orgId && <FileExplorer orgId={orgId} userId={userId} />}
    </div>
  );
}
