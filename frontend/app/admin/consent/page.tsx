"use client";

import { useState, useEffect } from "react";
import { Shield, Cookie, Check, X, Globe, RefreshCw } from "lucide-react";

interface ConsentStats {
  totalConsent: number;
  acceptanceRates: Record<string, number>;
  regionBreakdown: { region: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
}

export default function AdminConsentPage() {
  const [stats, setStats] = useState<ConsentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

  const fetchStats = async (range: string) => {
    setLoading(true);
    const from = new Date();
    if (range === "7d") from.setDate(from.getDate() - 7);
    else if (range === "30d") from.setDate(from.getDate() - 30);
    else if (range === "90d") from.setDate(from.getDate() - 90);

    try {
      const res = await fetch(`/api/admin/consent/stats?from=${from.toISOString()}`, { credentials: "include" });
      const data = await res.json();
      setStats(data.data);
    } catch (err) {
      console.error("Failed to fetch consent stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(dateRange); }, [dateRange]);

  const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) => (
    <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-sm ${color}`}>
          <Icon className="size-4 text-white" />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Consent Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Cookie consent analytics and compliance monitoring</p>
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
          <button onClick={() => fetchStats(dateRange)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-sm">
            <RefreshCw className="size-4 text-gray-400" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-sm animate-pulse" />)}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Consents" value={stats.totalConsent.toLocaleString()} icon={Cookie} color="bg-blue-500" />
            <StatCard label="Analytics Rate" value={`${stats.acceptanceRates.analytics}%`} icon={Check} color="bg-green-500" />
            <StatCard label="Marketing Rate" value={`${stats.acceptanceRates.marketing}%`} icon={X} color="bg-orange-500" />
            <StatCard label="Functional Rate" value={`${stats.acceptanceRates.functional}%`} icon={Globe} color="bg-purple-500" />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Acceptance Rates by Category</h3>
            <div className="space-y-3">
              {Object.entries(stats.acceptanceRates).map(([category, rate]) => (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700 dark:text-gray-300">{category}</span>
                    <span className="text-gray-500">{rate}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-primary transition-all"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">By Region</h3>
              <div className="space-y-2">
                {stats.regionBreakdown.map(r => (
                  <div key={r.region} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{r.region}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{r.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">By Source</h3>
              <div className="space-y-2">
                {stats.sourceBreakdown.map(s => (
                  <div key={s.source} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">{s.source.replace("-", " ")}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">No consent data available</div>
      )}
    </div>
  );
}
