"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, DollarSign, Target, RefreshCw } from "lucide-react";

interface AttributionReport {
  channels: { channel: string; events: number; uniqueUsers: number; conversions: number; conversionRate: number }[];
  campaigns: { campaign: string; impressions: number; clicks: number; conversions: number; conversionRate: number }[];
  ltv: number;
  churnRate: number;
  activationRate: number;
}

export default function AdminAttributionPage() {
  const [data, setData] = useState<AttributionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

  const fetchData = async (range: string) => {
    setLoading(true);
    const from = new Date();
    if (range === "7d") from.setDate(from.getDate() - 7);
    else if (range === "30d") from.setDate(from.getDate() - 30);
    else if (range === "90d") from.setDate(from.getDate() - 90);

    try {
      const res = await fetch(`/api/admin/attribution/report?from=${from.toISOString()}`, { credentials: "include" });
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error("Failed to fetch attribution data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(dateRange); }, [dateRange]);

  const StatCard = ({ label, value, icon: Icon, color, prefix = "", suffix = "" }: { label: string; value: string | number; icon: any; color: string; prefix?: string; suffix?: string }) => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${color}`}>
          <Icon className="size-4 text-white" />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{prefix}{typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}{suffix}</p>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketing Attribution</h1>
          <p className="text-sm text-gray-500 mt-1">Campaign performance, channel attribution, and conversion metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={() => fetchData(dateRange)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <RefreshCw className="size-4 text-gray-400" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="LTV" value={data.ltv} icon={DollarSign} color="bg-green-500" prefix="$" />
            <StatCard label="Churn Rate" value={data.churnRate} icon={TrendingUp} color="bg-red-500" suffix="%" />
            <StatCard label="Activation Rate" value={data.activationRate} icon={Target} color="bg-blue-500" suffix="%" />
            <StatCard label="Channels" value={data.channels.length} icon={BarChart3} color="bg-purple-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Channel Performance</h3>
              <div className="space-y-3">
                {data.channels.map(c => (
                  <div key={c.channel} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 capitalize">{c.channel}</span>
                      <span className="text-gray-500">{c.conversions} conv / {c.conversionRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${c.conversionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Campaign Performance</h3>
              {data.campaigns.length > 0 ? (
                <div className="space-y-2">
                  {data.campaigns.map(c => (
                    <div key={c.campaign} className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{c.campaign}</span>
                      <div className="flex items-center gap-3 text-gray-500">
                        <span>{c.impressions} imp</span>
                        <span>{c.conversionRate}% conv</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No campaign data available</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">No attribution data available</div>
      )}
    </div>
  );
}
