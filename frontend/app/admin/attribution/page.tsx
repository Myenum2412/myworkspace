"use client";

import { useEffect, useState } from "react";
import Stats07 from "@/components/stats-07";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "@/lib/icons";

interface AttributionReport {
  channels: {
    channel: string;
    events: number;
    uniqueUsers: number;
    conversions: number;
    conversionRate: number;
  }[];
  campaigns: {
    campaign: string;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }[];
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
      const res = await fetch(`/api/admin/attribution/report?from=${from.toISOString()}`, {
        credentials: "include",
      });
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error("Failed to fetch attribution data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Marketing Attribution
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Campaign performance, channel attribution, and conversion metrics
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
              { name: "LTV", value: data.ltv, subtitle: "Lifetime value" },
              { name: "Churn Rate", value: data.churnRate, subtitle: "Churn rate %" },
              {
                name: "Activation Rate",
                value: data.activationRate,
                subtitle: "Activation rate %",
              },
              { name: "Channels", value: data.channels.length, subtitle: "Active channels" },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.channels.map((c) => (
                  <div key={c.channel} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground capitalize">{c.channel}</span>
                      <span className="text-muted-foreground">
                        {c.conversions} conv / {c.conversionRate}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${c.conversionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.campaigns.length > 0 ? (
                  data.campaigns.map((c) => (
                    <div
                      key={c.campaign}
                      className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50"
                    >
                      <span className="text-foreground truncate max-w-[200px]">{c.campaign}</span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{c.impressions} imp</span>
                        <span>{c.conversionRate}% conv</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No campaign data available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No attribution data available</div>
      )}
    </div>
  );
}
