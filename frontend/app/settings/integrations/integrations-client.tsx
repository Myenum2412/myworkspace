"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  CheckCircle2Icon,
  UnplugIcon,
  Loader2Icon,
  ExternalLinkIcon,
  AlertCircleIcon,
} from "lucide-react";

type Connection = {
  id: string;
  provider: "google" | "microsoft";
  calendarEmail: string;
  calendarName: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  createdAt: string;
};

interface IntegrationsClientProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export function IntegrationsClient({ userId, userName, userEmail }: IntegrationsClientProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/connections");
      const data = await res.json();
      setConnections(data.data || []);
    } catch {
      console.error("Failed to fetch connections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") || params.get("error")) {
      fetchConnections();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchConnections]);

  const handleDisconnect = async (connectionId: string) => {
    setDisconnecting(connectionId);
    try {
      await fetch(`/api/calendar/connections?id=${connectionId}`, { method: "DELETE" });
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch {
      console.error("Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  const googleConnection = connections.find((c) => c.provider === "google");
  const microsoftConnection = connections.find((c) => c.provider === "microsoft");

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-3xl">
      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-red-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="size-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Google Calendar</CardTitle>
                <CardDescription>Sync events from your Google Calendar</CardDescription>
              </div>
            </div>
            {googleConnection ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <CheckCircle2Icon className="size-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {googleConnection ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Connected as:</span>
                <span className="font-medium text-foreground">{googleConnection.calendarEmail}</span>
              </div>
              {googleConnection.lastSyncAt && (
                <div className="text-xs text-muted-foreground">
                  Last synced: {new Date(googleConnection.lastSyncAt).toLocaleString()}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(googleConnection.id)}
                  disabled={disconnecting === googleConnection.id}
                >
                  {disconnecting === googleConnection.id ? (
                    <Loader2Icon className="size-4 mr-1 animate-spin" />
                  ) : (
                    <UnplugIcon className="size-4 mr-1" />
                  )}
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button asChild>
                <a href="/api/calendar/google">
                  <CalendarIcon className="size-4 mr-2" />
                  Connect Google Calendar
                </a>
              </Button>
              <span className="text-xs text-muted-foreground">
                Read-only access to view your events
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Microsoft Outlook */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="size-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.4 2H2v20h9V9.6L22 2v20h-9" fill="#0078D4"/>
                  <path d="M11.4 9.6V22H2V9.6l9.4-7.6z" fill="#0078D4" opacity="0.8"/>
                  <path d="M22 2l-10.6 7.6V2H22z" fill="#0078D4" opacity="0.6"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Microsoft Outlook</CardTitle>
                <CardDescription>Sync events from your Outlook Calendar</CardDescription>
              </div>
            </div>
            {microsoftConnection ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <CheckCircle2Icon className="size-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {microsoftConnection ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Connected as:</span>
                <span className="font-medium text-foreground">{microsoftConnection.calendarEmail}</span>
              </div>
              {microsoftConnection.lastSyncAt && (
                <div className="text-xs text-muted-foreground">
                  Last synced: {new Date(microsoftConnection.lastSyncAt).toLocaleString()}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(microsoftConnection.id)}
                  disabled={disconnecting === microsoftConnection.id}
                >
                  {disconnecting === microsoftConnection.id ? (
                    <Loader2Icon className="size-4 mr-1 animate-spin" />
                  ) : (
                    <UnplugIcon className="size-4 mr-1" />
                  )}
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button asChild>
                  <a href="/api/calendar/microsoft">
                    <CalendarIcon className="size-4 mr-2" />
                    Connect Outlook Calendar
                  </a>
                </Button>
                <span className="text-xs text-muted-foreground">
                  Read-only access to view your events
                </span>
              </div>
              {process.env.MICROSOFT_CLIENT_ID === "YOUR_MICROSOFT_CLIENT_ID" && (
                <div className="flex items gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>Microsoft integration requires Azure AD credentials. Contact your admin to configure.</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground space-y-2">
          <CalendarIcon className="size-8 mx-auto text-muted-foreground/30" />
          <p>Connected calendars will appear in your <strong>Upcoming Tasks</strong> calendar view.</p>
          <p className="text-xs">Events are fetched in real-time. No data is stored beyond your authentication tokens.</p>
        </CardContent>
      </Card>
    </div>
  );
}
