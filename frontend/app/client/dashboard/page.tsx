"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, FolderOpen, Bell, Settings, ClipboardList, Building2, ChevronRight, FileText } from "lucide-react";

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

export default function ClientDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("client_token");
    if (!token) {
      router.push("/client/login");
      return;
    }
    const stored = localStorage.getItem("client_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
    fetchMe(token);
    fetchStats(token);
  }, []);

  async function fetchMe(token: string) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/client-auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUser(data.data.user);
        setClient(data.data.client);
      } else {
        localStorage.removeItem("client_token");
        router.push("/client/login");
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats(token: string) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/client-auth/workspace-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    router.push("/client/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="size-6 text-primary" />
            <span className="font-semibold text-lg">Client Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Badge variant={client?.status === "Active Client" ? "default" : "secondary"} className="text-xs">
              {client?.status || "N/A"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.name || "Client"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {client?.company ? `${client.company} — ` : ""}Manage your projects, tasks, and documents
          </p>
        </div>

        {user?.mustChangePassword && (
          <div className="rounded-lg bg-gray-100 border-border p-4">
            <p className="text-sm text-gray-700 font-medium">
              You must change your password before continuing.
            </p>
            <Button size="sm" className="mt-2" onClick={() => router.push("/client/settings?forcePasswordChange=true")}>
              Change Password Now
            </Button>
          </div>
        )}

        {!user?.emailVerified && (
          <div className="rounded-lg bg-gray-700 border-border p-4">
            <p className="text-sm text-gray-700">
              Please verify your email address to access all features.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard icon={User} title="My Profile" description="View and edit your profile" href="/client/profile" />
          <QuickActionCard icon={ClipboardList} title="Projects" description={`${client?.projects || 0} active projects`} href="/client/projects" />
          <QuickActionCard icon={FolderOpen} title="Documents" description={`${stats?.fileCount ?? 0} files in ${stats?.folderCount ?? 0} folders`} href="/client/documents" />
          <QuickActionCard icon={Bell} title="Notifications" description="View your notifications" href="/client/notifications" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Full Name</span>
                <p className="font-medium">{user?.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Account Status</span>
                <p className="font-medium">
                  <Badge variant={user?.emailVerified ? "default" : "secondary"} className="text-xs">
                    {user?.emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {stats && stats.recentFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.recentFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{f.category}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Quick Settings</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/client/settings")}>
              <Settings className="size-4 mr-1" /> Settings
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-between h-auto py-3" onClick={() => router.push("/client/profile")}>
              <span className="flex items-center gap-2"><User className="size-4" /> Edit Profile</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Button>
            <Button variant="outline" className="justify-between h-auto py-3" onClick={() => router.push("/client/settings")}>
              <span className="flex items-center gap-2"><Settings className="size-4" /> Account Settings</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>
      </main>
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
