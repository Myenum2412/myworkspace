"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { useIndustry } from "@/components/industry-provider";
import { ClockIcon, ActivityIcon } from "lucide-react";

type ActivityRow = {
  id: string;
  userName: string;
  userAvatar: string | null;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
};

const ACTION_BADGES: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login: "bg-purple-100 text-purple-700",
  logout: "bg-gray-100 text-gray-700",
  status: "bg-yellow-100 text-yellow-700",
};

function getActionBadge(action: string) {
  for (const [key, cls] of Object.entries(ACTION_BADGES)) {
    if (action.toLowerCase().includes(key)) return cls;
  }
  return "bg-slate-100 text-slate-700";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function StaffActivityPage() {
  const { t } = useIndustry();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.orgId) return;
    let cancelled = false;
    apiFetch(`/api/activity?orgId=${session.user.orgId}&limit=200`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!cancelled && d?.data) setActivities(d.data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.user?.orgId]);

  const columns: ColumnDef<ActivityRow>[] = useMemo(() => [
    {
      accessorKey: "userName",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            {row.original.userAvatar && <AvatarImage src={row.original.userAvatar} alt={row.original.userName} />}
            <AvatarFallback className="text-[10px]">{row.original.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm">{row.original.userName}</span>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge className={`text-xs font-medium ${getActionBadge(row.original.action)}`}>
          {row.original.action.replace(/_/g, " ").replace(/\./g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "entityType",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-sm capitalize text-muted-foreground">
          {row.original.entityType?.replace(/_/g, " ") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1">{row.original.description || "—"}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ClockIcon className="size-3.5 shrink-0" />
          {formatDate(row.original.createdAt)}
        </div>
      ),
    },
  ], []);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("page.staffs.activity")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("nav.staffActivity")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ActivityIcon className="size-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={activities}
            searchPlaceholder="Search activity..."
            emptyMessage="No activity found."
            label="activity"
            hideSearchBar={false}
            showCheckboxes={false}
          />
        </CardContent>
      </Card>
    </main>
  );
}
