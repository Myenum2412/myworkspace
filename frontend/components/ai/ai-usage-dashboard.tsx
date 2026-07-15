"use client";

import { useQuery } from "@tanstack/react-query";
import { aiService, UsageStats } from "@/lib/services/ai/ai-service";
import { useState } from "react";
import { Activity, Users, DollarSign, Clock, Zap, BarChart3 } from "lucide-react";

export function AiUsageDashboard() {
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["ai-usage", dateRange],
    queryFn: () => aiService.getUsageStats({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats: UsageStats = data || {
    summary: {
      totalRequests: 0, totalPromptTokens: 0, totalCompletionTokens: 0,
      totalTokens: 0, totalCost: 0, totalExecutionTime: 0,
      uniqueUsers: 0, avgResponseTime: 0,
    },
    dailyStats: [],
    topUsers: [],
    topActions: [],
  };

  const cards = [
    { label: "Total Requests", value: stats.summary.totalRequests.toLocaleString(), icon: Activity, color: "text-blue-500" },
    { label: "Active Users", value: stats.summary.uniqueUsers.toLocaleString(), icon: Users, color: "text-green-500" },
    { label: "Total Tokens", value: stats.summary.totalTokens.toLocaleString(), icon: Zap, color: "text-yellow-500" },
    { label: "Est. Cost", value: `$${stats.summary.totalCost.toFixed(4)}`, icon: DollarSign, color: "text-emerald-500" },
    { label: "Avg Response", value: `${(stats.summary.avgResponseTime / 1000).toFixed(2)}s`, icon: Clock, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Usage Dashboard</h3>
          <p className="text-sm text-muted-foreground">Monitor AI request patterns and costs.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.startDate || ""}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value || undefined }))}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
          />
          <input
            type="date"
            value={dateRange.endDate || ""}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value || undefined }))}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <div className="text-xl font-semibold">{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Daily Usage (Last 30 days)
          </h4>
          {stats.dailyStats.length > 0 ? (
            <div className="space-y-1">
              {stats.dailyStats.slice(0, 14).map((day) => (
                <div key={day._id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{day._id}</span>
                  <div className="flex items-center gap-3">
                    <span>{day.requests} requests</span>
                    <span className="text-muted-foreground">{day.tokens.toLocaleString()} tokens</span>
                    <span className="text-emerald-600 dark:text-emerald-400">${day.cost.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">No usage data yet</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Top Active Users
          </h4>
          {stats.topUsers.length > 0 ? (
            <div className="space-y-2">
              {stats.topUsers.map((user, i) => (
                <div key={user._id} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[200px]">{user._id}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span>{user.requests} requests</span>
                    <span className="text-muted-foreground">{user.tokens.toLocaleString()} tokens</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">No user data yet</p>
          )}

          <h4 className="text-sm font-medium mb-3 mt-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Most Used Features
          </h4>
          {stats.topActions.length > 0 ? (
            <div className="space-y-1">
              {stats.topActions.map((action) => (
                <div key={action._id} className="flex items-center justify-between text-xs">
                  <span>{action._id.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{action.count} times</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2 text-center">No action data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
