"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "@/lib/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Stats07 from "@/components/stats-07";

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Consent Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Cookie consent analytics and compliance monitoring</p>
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
          <button onClick={() => fetchStats(dateRange)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg">
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : stats ? (
        <>
          <Stats07
            items={[
              { name: "Total Consents", value: stats.totalConsent, subtitle: "Total consents" },
              { name: "Analytics", value: stats.acceptanceRates.analytics, subtitle: "Analytics rate %" },
              { name: "Marketing", value: stats.acceptanceRates.marketing, subtitle: "Marketing rate %" },
              { name: "Functional", value: stats.acceptanceRates.functional, subtitle: "Functional rate %" },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle>Acceptance Rates by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stats.acceptanceRates).map(([category, rate]) => (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize text-foreground">{category}</span>
                    <span className="text-muted-foreground">{rate}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>By Region</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.regionBreakdown.map(r => (
                  <div key={r.region} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{r.region}</span>
                    <span className="text-foreground font-medium">{r.count.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>By Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.sourceBreakdown.map(s => (
                  <div key={s.source} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{s.source.replace("-", " ")}</span>
                    <span className="text-foreground font-medium">{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No consent data available</div>
      )}
    </div>
  );
}