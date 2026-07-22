"use client";

import { useState, useEffect } from "react";
import { BarChart3, Activity, AlertTriangle, TrendingUp, Users, Zap, RefreshCw } from "lucide-react";

interface AnalyticsData {
  totalEvents: number;
  categoryBreakdown: { category: string; count: number }[];
  topEvents: { event: string; count: number }[];
  dailyEventCounts: { date: string; count: number }[];
  conversionFunnel: { event: string; count: number; uniqueUsers: number }[];
  errorRate: number;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

  const fetchData = async (range: string) => {
    setLoading(true);
    const from = new Date();
    if (range === "7d") from.setDate(from.getDate() - 7);
    else if (range === "30d") from.setDate(from.getDate() - 30);
    else if (range === "90d") from.setDate(from.getDate() - 90);

    try {
      const res = await fetch(`/api/admin/analytics/overview?from=${from.toISOString()}`, { credentials: "include" });
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(dateRange); }, [dateRange]);

  const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) => (
    <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-sm ${color}`}>
          <Icon className="size-4 text-white" />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );

  const funnelLabels: Record<string, string> = {
    sign_up: "Signed Up",
    workspace_created: "Created Workspace",
    onboarding_complete: "Completed Onboarding",
    subscription_upgraded: "Upgraded",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Event tracking, feature adoption, and retention metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-sm px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={() => fetchData(dateRange)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-sm">
            <RefreshCw className="size-4 text-gray-400" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-sm animate-pulse" />)}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Events" value={data.totalEvents} icon={Activity} color="bg-blue-500" />
            <StatCard label="Categories" value={data.categoryBreakdown.length} icon={BarChart3} color="bg-green-500" />
            <StatCard label="Error Rate" value={`${data.errorRate}%`} icon={AlertTriangle} color="bg-red-500" />
            <StatCard label="Unique Events" value={data.topEvents.length} icon={Zap} color="bg-purple-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top Events</h3>
              <div className="space-y-2">
                {data.topEvents.slice(0, 10).map(e => (
                  <div key={e.event} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 truncate">{e.event}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium ml-4">{e.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Conversion Funnel</h3>
              <div className="space-y-3">
                {data.conversionFunnel.map((f, i) => {
                  const maxCount = data.conversionFunnel[0]?.count || 1;
                  const pct = Math.round((f.count / maxCount) * 100);
                  return (
                    <div key={f.event}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{funnelLabels[f.event] || f.event}</span>
                        <span className="text-gray-500">{f.count.toLocaleString()} users</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-sm overflow-hidden">
                        <div
                          className={`h-full rounded-sm transition-all ${i === 0 ? "bg-primary" : i === data.conversionFunnel.length - 1 ? "bg-green-500" : "bg-blue-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Event Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.categoryBreakdown.map(c => (
                <div key={c.category} className="flex items-center justify-between p-2 rounded-sm bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{c.category}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">No analytics data available</div>
      )}
    </div>
  );
}
