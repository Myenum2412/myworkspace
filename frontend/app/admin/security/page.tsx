"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck, ShieldAlert, Smartphone, Users, Activity,
  AlertTriangle, Loader2, RefreshCw, UserCheck, Hash,
  Monitor,
} from "lucide-react";

interface MfaStats {
  totalUsers: number;
  mfaEnabledUsers: number;
  mfaPendingUsers: number;
  mfaBypassUsers: number;
  adoptionRate: number;
  methodBreakdown: Record<string, number>;
  recentVerifications: number;
  recentFailures: number;
}

interface MfaUser {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
  twoFactorPendingSecret: boolean;
  twoFactorEnabledAt: string | null;
  twoFactorLastVerifiedAt: string | null;
}

interface ActivityEntry {
  _id: string;
  action: string;
  description: string;
  createdAt: string;
  success: boolean;
  userId: string;
  ipAddress?: string;
}

interface RiskEvent {
  _id: string;
  userId: string;
  email: string;
  riskType: string;
  riskScore: number;
  action: string;
  createdAt: string;
}

interface FailedLogin {
  _id: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  reason: string;
  createdAt: string;
}

interface AdoptionBreakdown {
  role: string;
  total: number;
  enabled: number;
  rate: number;
}

export default function AdminSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MfaStats | null>(null);
  const [users, setUsers] = useState<MfaUser[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [adoption, setAdoption] = useState<AdoptionBreakdown[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const base = "/api/admin/security";
      const [
        statsRes, usersRes, activityRes,
        riskRes, failedRes, adoptionRes,
      ] = await Promise.all([
        fetch(`${base}/stats`, { credentials: "include" }),
        fetch(`${base}/users`, { credentials: "include" }),
        fetch(`${base}/activity`, { credentials: "include" }),
        fetch(`${base}/risk-events`, { credentials: "include" }),
        fetch(`${base}/failed-logins`, { credentials: "include" }),
        fetch(`${base}/adoption`, { credentials: "include" }),
      ]);

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const activityData = await activityRes.json();
      const riskData = await riskRes.json();
      const failedData = await failedRes.json();
      const adoptionData = await adoptionRes.json();

      if (statsData.success) setStats(statsData.data);
      if (usersData.success) setUsers(usersData.data);
      if (activityData.success) setActivities(activityData.data);
      if (riskData.success) setRiskEvents(riskData.data);
      if (failedData.success) setFailedLogins(failedData.data);
      if (adoptionData.success) setAdoption(adoptionData.data);
    } catch (e) {
      console.error("Failed to fetch security data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  function fmt(iso: string | null | undefined) {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleString();
  }

  function actionLabel(a: string) {
    const map: Record<string, string> = {
      "twoFactor.enabled": "MFA Enabled",
      "twoFactor.disabled": "MFA Disabled",
      "twoFactor.admin_reset": "Admin MFA Reset",
      "twoFactor.verification_success": "MFA Verified",
      "twoFactor.verification_failure": "MFA Failed",
    };
    return map[a] || a.replace("twoFactor.", "MFA ");
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Security Administration</h1>
          <p className="text-sm text-gray-500 mt-1">MFA enforcement, risk monitoring, and security analytics</p>
        </div>
        <button onClick={fetchAll} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-sm">
          <RefreshCw className="size-4 text-gray-400" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex">
            {[
              { id: "overview", label: "Overview" },
              { id: "users", label: "Users" },
              { id: "activity", label: "Activity Log" },
              { id: "risk", label: "Risk Events" },
              { id: "failed", label: "Failed Logins" },
              { id: "adoption", label: "Adoption" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {/* Overview */}
          {activeTab === "overview" && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-sm border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold mb-3">Method Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(stats.methodBreakdown).length === 0 ? (
                    <p className="text-xs text-gray-400">No data</p>
                  ) : (
                    Object.entries(stats.methodBreakdown).map(([method, count]) => (
                      <div key={method} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">{method === "totp" ? "Authenticator App" : method}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-sm border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold mb-3">Enrollment Status</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Enabled</span>
                      <span className="font-medium">{stats.mfaEnabledUsers}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-sm overflow-hidden">
                      <div className="h-full bg-green-500 rounded-sm" style={{ width: `${(stats.mfaEnabledUsers / stats.totalUsers) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Pending</span>
                      <span className="font-medium">{stats.mfaPendingUsers}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-sm overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-sm" style={{ width: `${(stats.mfaPendingUsers / stats.totalUsers) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Not Enrolled</span>
                      <span className="font-medium">{stats.mfaBypassUsers}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-sm overflow-hidden">
                      <div className="h-full bg-red-500 rounded-sm" style={{ width: `${(stats.mfaBypassUsers / stats.totalUsers) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              {adoption.length > 0 && (
                <div className="rounded-sm border border-gray-100 dark:border-gray-700 p-4 md:col-span-2">
                  <h3 className="text-sm font-semibold mb-3">Adoption by Role</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {adoption.map((a) => (
                      <div key={a.role} className="flex items-center justify-between p-2 rounded-sm bg-gray-50 dark:bg-gray-800/50">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{a.role}</span>
                          <span className="text-xs text-gray-400 ml-2">({a.enabled}/{a.total})</span>
                        </div>
                        <span className={`text-sm font-bold ${a.rate >= 0.8 ? "text-green-600" : a.rate >= 0.5 ? "text-amber-600" : "text-red-600"}`}>
                          {Math.round(a.rate * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {activeTab === "users" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Email</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Role</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">MFA</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Method</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Last Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No users</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 px-3">{u.name || "—"}</td>
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                        <td className="py-2 px-3 capitalize">{u.role}</td>
                        <td className="py-2 px-3 text-center">
                          {u.twoFactorEnabled ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                              <ShieldCheck className="size-3" /> Active
                            </span>
                          ) : u.twoFactorPendingSecret ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                              <ShieldAlert className="size-3" /> Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium">
                              <ShieldAlert className="size-3" /> Off
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400 capitalize">{u.twoFactorMethod || "—"}</td>
                        <td className="py-2 px-3 text-xs text-gray-400">{fmt(u.twoFactorLastVerifiedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Activity */}
          {activeTab === "activity" && (
            <div className="space-y-2">
              {activities.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No activity</p>
              ) : (
                activities.map((a) => (
                  <div key={a._id} className="flex items-start gap-3 rounded-sm border border-gray-100 dark:border-gray-700 p-3">
                    <div className={`mt-0.5 ${a.success ? "text-green-500" : "text-red-500"}`}>
                      {a.success ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{actionLabel(a.action)}</p>
                      <p className="text-xs text-gray-500 truncate">{a.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{fmt(a.createdAt)}</span>
                        {a.ipAddress && <span>IP: {a.ipAddress}</span>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-sm shrink-0 ${
                      a.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {a.success ? "OK" : "FAIL"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Risk */}
          {activeTab === "risk" && (
            <div className="space-y-2">
              {riskEvents.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No risk events</p>
              ) : (
                riskEvents.map((r) => (
                  <div key={r._id} className="flex items-start gap-3 rounded-sm border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                    <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.riskType}</p>
                      <p className="text-xs text-gray-500">{r.email} — Score: {r.riskScore}</p>
                      <p className="text-xs text-gray-400 mt-1">{fmt(r.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-sm shrink-0 ${
                      r.riskScore >= 80 ? "bg-red-100 text-red-700" :
                      r.riskScore >= 50 ? "bg-amber-100 text-amber-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {r.riskScore}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Failed Logins */}
          {activeTab === "failed" && (
            <div className="space-y-2">
              {failedLogins.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No failed logins</p>
              ) : (
                failedLogins.map((f) => (
                  <div key={f._id} className="flex items-start gap-3 rounded-sm border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 p-3">
                    <AlertTriangle className="size-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{f.email}</p>
                      <p className="text-xs text-gray-500">{f.reason}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{f.ipAddress}</span>
                        <span>{fmt(f.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Adoption */}
          {activeTab === "adoption" && (
            <div className="space-y-3">
              {adoption.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No data</p>
              ) : (
                adoption.map((a) => (
                  <div key={a.role}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{a.role}</span>
                      <span className="text-gray-500">{a.enabled}/{a.total} ({Math.round(a.rate * 100)}%)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-sm overflow-hidden">
                      <div className={`h-full rounded-sm ${
                        a.rate >= 0.8 ? "bg-green-500" : a.rate >= 0.5 ? "bg-amber-500" : "bg-red-500"
                      }`} style={{ width: `${a.rate * 100}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
