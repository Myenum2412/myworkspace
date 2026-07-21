"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch, apiUrl } from "@/lib/api";
import {
  ShieldCheck, ShieldOff, ShieldAlert, Smartphone,
  Laptop, KeyRound, History, AlertTriangle, Loader2,
  CheckCircle2, XCircle, Clock, Globe, Monitor,
  UserCheck, Hash, Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MfaStatus = {
  enabled: boolean;
  method: string;
  pendingVerification: boolean;
  enabledAt: string | null;
  lastVerifiedAt: string | null;
  backupCodesGeneratedAt: string | null;
};

type TrustedDevice = {
  id: string;
  deviceName: string;
  deviceFingerprint: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  lastUsedAt: string;
  createdAt: string;
};

type RecoveryCodeStatus = {
  total: number;
  used: number;
  remaining: number;
  generatedAt: string | null;
};

type ActivityEntry = {
  _id: string;
  action: string;
  description: string;
  createdAt: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
};

export default function SecurityDashboard() {
  const [loading, setLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryCodeStatus | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, devicesRes, recoveryRes, activityRes] = await Promise.all([
        apiFetch(apiUrl("/api/two-factor/status")).then(r => r.json()),
        apiFetch(apiUrl("/api/two-factor/trusted-devices")).then(r => r.json()),
        apiFetch(apiUrl("/api/two-factor/recovery-codes/status")).then(r => r.json()),
        apiFetch(apiUrl("/api/two-factor/activity")).then(r => r.json()),
      ]);

      if (statusRes.success) setMfaStatus(statusRes.data);
      if (devicesRes.success) setTrustedDevices(devicesRes.data);
      if (recoveryRes.success) setRecoveryStatus(recoveryRes.data);
      if (activityRes.success) setActivities(activityRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleString();
  }

  function actionLabel(action: string): string {
    const map: Record<string, string> = {
      "twoFactor.setup_started": "Setup started",
      "twoFactor.enabled": "MFA enabled",
      "twoFactor.disabled": "MFA disabled",
      "twoFactor.verification_success": "Verification success",
      "twoFactor.verification_failure": "Verification failed",
      "twoFactor.recovery_code_used": "Recovery code used",
      "twoFactor.recovery_codes_generated": "Codes regenerated",
      "twoFactor.trust_device": "Device trusted",
      "twoFactor.remove_trusted_device": "Device removed",
      "twoFactor.admin_reset": "Admin reset",
      "twoFactor.step_up.verified": "Step-up verified",
      "user.login": "Login",
    };
    return map[action] || action.replace("twoFactor.", "");
  }

  function getSecurityScore(): { score: number; level: string; recommendations: string[] } {
    const recommendations: string[] = [];
    let score = 100;

    if (!mfaStatus?.enabled) {
      score -= 40;
      recommendations.push("Enable two-factor authentication");
    } else {
      if (recoveryStatus && recoveryStatus.remaining <= 2) {
        score -= 10;
        recommendations.push("Generate new recovery codes");
      }
      if (trustedDevices.length > 5) {
        score -= 5;
        recommendations.push("Review and remove unused trusted devices");
      }
    }

    const level = score >= 80 ? "good" : score >= 50 ? "fair" : "poor";
    return { score, level, recommendations };
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const securityScore = getSecurityScore();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Dashboard</CardTitle>
              <CardDescription>Real-time security status and recommendations</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Security Score</span>
              <div className={`rounded-full px-3 py-1 text-sm font-bold ${
                securityScore.level === "good" ? "bg-green-100 text-green-700" :
                securityScore.level === "fair" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`}>
                {securityScore.score}/100
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                {mfaStatus?.enabled ? (
                  <ShieldCheck className="size-4 text-green-500" />
                ) : (
                  <ShieldOff className="size-4 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">MFA Status</span>
              </div>
              <p className="text-lg font-bold">
                {mfaStatus?.enabled ? "Enabled" : mfaStatus?.pendingVerification ? "Pending" : "Disabled"}
              </p>
              {mfaStatus?.enabledAt && (
                <p className="text-xs text-muted-foreground">Since {formatDate(mfaStatus.enabledAt)}</p>
              )}
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-blue-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Method</span>
              </div>
              <p className="text-lg font-bold capitalize">
                {mfaStatus?.method === "totp" ? "Authenticator App" : mfaStatus?.method || "None"}
              </p>
              {mfaStatus?.lastVerifiedAt && (
                <p className="text-xs text-muted-foreground">Last verified {formatDate(mfaStatus.lastVerifiedAt)}</p>
              )}
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Laptop className="size-4 text-purple-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Trusted Devices</span>
              </div>
              <p className="text-lg font-bold">{trustedDevices.length}</p>
              <p className="text-xs text-muted-foreground">Active trusted devices</p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-amber-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Recovery Codes</span>
              </div>
              <p className="text-lg font-bold">
                {recoveryStatus ? `${recoveryStatus.remaining}/${recoveryStatus.total}` : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Remaining codes</p>
            </div>
          </div>

          {securityScore.recommendations.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Recommendations</span>
              </div>
              <ul className="space-y-1">
                {securityScore.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-4">
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-medium mb-3">Authentication Methods</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="size-4 text-muted-foreground" />
                      <span className="text-sm">Password</span>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-700">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-muted-foreground" />
                      <span className="text-sm">TOTP Authenticator</span>
                    </div>
                    <Badge variant={mfaStatus?.enabled ? "default" : "outline"}
                      className={mfaStatus?.enabled ? "bg-green-100 text-green-700" : ""}>
                      {mfaStatus?.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="devices" className="space-y-3 pt-4">
              {trustedDevices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No trusted devices</p>
              ) : (
                trustedDevices.map((device) => (
                  <div key={device.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Laptop className="size-8 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{device.deviceName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        <span>Trusted until {formatDate(device.expiresAt)}</span>
                        {device.ipAddress && (
                          <>
                            <Globe className="size-3" />
                            <span>{device.ipAddress}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-2 pt-4">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-2">
                    {activities.map((entry) => (
                      <div key={entry._id} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="mt-0.5">
                          {entry.success ? (
                            <CheckCircle2 className="size-4 text-green-500" />
                          ) : (
                            <XCircle className="size-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{actionLabel(entry.action)}</p>
                          <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Clock className="size-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                            {entry.ipAddress && (
                              <>
                                <Globe className="size-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground">{entry.ipAddress}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant={entry.success ? "default" : "destructive"} className="shrink-0">
                          {entry.success ? "Success" : "Failed"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
