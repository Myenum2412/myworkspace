"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FolderIcon from "@mui/icons-material/Folder";
import { LogOut, Receipt, FileText, Loader2, AlertCircleIcon, ClockIcon } from "lucide-react";
import Link from "next/link";

type ClientUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  emailVerified: boolean;
};

type ClientInfo = {
  id: string;
  name: string;
  company: string;
  status: string;
};

type WorkspaceStats = {
  folderCount: number;
  fileCount: number;
  recentFiles: { id: string; name: string; mimeType: string; size: number; category: string; createdAt: string }[];
};

type BillingStatus = {
  pendingCount: number;
  totalDue: number;
  invoices: { id: string; number: string; amountDue: number; status: string }[];
};

export default function DashboardInteractive() {
  const router = useRouter();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      const storedFlag = localStorage.getItem("must_change_password");
      if (storedFlag === "true") {
        router.push("/client/login");
        return;
      }
      const token = localStorage.getItem("client_token") || "";
      if (session.user) {
        setUser({
          id: session.user.id,
          name: session.user.name || "Client",
          email: session.user.email || "",
          role: session.user.role || "client",
          mustChangePassword: false,
          emailVerified: true
        });
      }
      fetchMe(token);
      fetchStats(token);
      fetchBillingStatus(token);
    }
  }, [status, router, session]);

  async function fetchMe(token: string) {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/client-auth/me`, { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setUser(data.data.user);
        setClient(data.data.client);
      }
    } catch {
      setError("Failed to load account data");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats(token: string) {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/client-auth/workspace-stats`, { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch {
      // silent
    }
  }

  async function fetchBillingStatus(token: string) {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/client-auth/billing-status`, { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setBillingStatus(data.data);
      }
    } catch {
      // silent
    }
  }

  function handleLogout() {
    localStorage.removeItem("client_token");
    localStorage.removeItem("client_user");
    localStorage.removeItem("must_change_password");
    signOut({ callbackUrl: "/login" });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.name || "Client"}</h1>
          {client?.company && (
            <p className="text-muted-foreground text-sm mt-1">{client.company}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="size-4 mr-1" /> Logout
        </Button>
      </div>

      {billingStatus && billingStatus.pendingCount > 0 && (
        <Link href="/client/bills" className="block w-full no-underline">
          <div className="w-full flex items-center gap-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <AlertCircleIcon className="size-5 text-amber-600 shrink-0" />
            <span className="font-medium text-amber-800">
              {billingStatus.pendingCount} pending invoice{billingStatus.pendingCount > 1 ? "s" : ""}
            </span>
            <span className="text-amber-700">
              — ₹{(billingStatus.totalDue / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <ClockIcon className="size-4 text-amber-500 ml-auto shrink-0" />
          </div>
        </Link>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <QuickActionCard icon={FolderIcon} title="File Manager" description={`${stats?.fileCount ?? 0} files`} href="/client/file-manager" />
        <QuickActionCard icon={Receipt} title="Bills" description="View invoices & billing" href="/client/bills" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Files</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats || stats.recentFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">{f.category}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  const router = useRouter();
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(href)}>
      <CardContent className="p-6">
        <div className="rounded-sm bg-primary/10 p-3 w-fit mb-3">
          <Icon className="size-5 text-primary" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
