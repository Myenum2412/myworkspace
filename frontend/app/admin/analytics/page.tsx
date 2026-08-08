"use client";

import { useEffect, useState } from "react";
import Stats07 from "@/components/stats-07";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "@/lib/icons";

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
      const res = await fetch(`/api/admin/analytics/overview?from=${from.toISOString()}`, {
        credentials: "include",
      });
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange]);

  const funnelLabels: Record<string, string> = {
    sign_up: "Signed Up",
    workspace_created: "Created Workspace",
    onboarding_complete: "Completed Onboarding",
    subscription_upgraded: "Upgraded",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Event tracking, feature adoption, and retention metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={() => fetchData(dateRange)}
            className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          <Stats07
            items={[
              { name: "Total Events", value: data.totalEvents, subtitle: "Total Events" },
              {
                name: "Categories",
                value: data.categoryBreakdown.length,
                subtitle: "Event Categories",
              },
              { name: "Error Rate", value: data.errorRate, subtitle: "Error rate %" },
              { name: "Unique Events", value: data.topEvents.length, subtitle: "Unique Events" },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.topEvents.slice(0, 10).map((e) => (
                  <div key={e.event} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">{e.event}</span>
                    <span className="text-foreground font-medium ml-4">
                      {e.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.conversionFunnel.map((f, i) => {
                  const maxCount = data.conversionFunnel[0]?.count || 1;
                  const pct = Math.round((f.count / maxCount) * 100);
                  return (
                    <div key={f.event}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground">{funnelLabels[f.event] || f.event}</span>
                        <span className="text-muted-foreground">
                          {f.count.toLocaleString()} users
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${i === 0 ? "bg-primary" : i === data.conversionFunnel.length - 1 ? "bg-green-500" : "bg-blue-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Event Categories</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.categoryBreakdown.map((c) => (
                <div
                  key={c.category}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm text-muted-foreground capitalize">{c.category}</span>
                  <span className="text-sm font-medium text-foreground">
                    {c.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No analytics data available</div>
      )}
    </div>
  );
}
