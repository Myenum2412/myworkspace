"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, FolderOpen, Bell, ClipboardList, Building2, FileText, Loader2 } from "lucide-react";

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
  projects: number;
};

type WorkspaceStats = {
  folderCount: number;
  fileCount: number;
  recentFiles: { id: string; name: string; mimeType: string; size: number; category: string; createdAt: string }[];
};

export default function DashboardInteractive() {
  const router = useRouter();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
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

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <QuickActionCard icon={ClipboardList} title="Projects" description={`${client?.projects || 0} active`} href="/client/projects" />
        <QuickActionCard icon={FolderOpen} title="File Manager" description={`${stats?.fileCount ?? 0} files`} href="/client/file-manager" />
        <QuickActionCard icon={Bell} title="Notifications" description="View updates" href="/client/notifications" />
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
        <div className="rounded-full bg-primary/10 p-3 w-fit mb-3">
          <Icon className="size-5 text-primary" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
