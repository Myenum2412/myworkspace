"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { FileExplorer } from "@/components/file-explorer";
import { Loader2Icon } from "lucide-react";

export default function StaffFilesPage() {
  const { data: session } = useSession();
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/user/profile", { credentials: "include" });
        const d = await res.json();
        const p = d.data || d;
        const id = p?.org?.id || p?.org?._id?.toString() || "";
        if (id) setOrgId(id);
      } catch (error) {
        console.error("[STAFF FILES] Failed to load profile:", error);
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

  const userId = session?.user?.id || "";

  return (
    <div className="space-y-6">
      {orgId ? (
        <FileExplorer orgId={orgId} userId={userId} />
      ) : (
        <p className="text-sm text-muted-foreground">No organization found.</p>
      )}
    </div>
  );
}
