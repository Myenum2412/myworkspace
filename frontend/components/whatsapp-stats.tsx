"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MessageSquare, RefreshCw, Loader2, BarChart3 } from "lucide-react";

interface Stats {
  totalConversations: number;
  uniqueCustomers: number;
  intentDistribution: Record<string, number>;
  avgProcessingTime: number;
  successRate: number;
  messageLimit: number;
  messagesRemaining: number;
}

export function WhatsAppStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/stats", { credentials: "include" });
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            <CardTitle className="text-lg">WhatsApp AI</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={loadStats} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className={`text-2xl font-bold ${stats.messagesRemaining <= 0 ? "text-destructive" : stats.messagesRemaining < 100 ? "text-amber-500" : ""}`}>{stats.messagesRemaining}</p>
              <p className="text-xs text-muted-foreground">Messages Left</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stats.totalConversations}</p>
              <p className="text-xs text-muted-foreground">Total Messages</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stats.uniqueCustomers}</p>
              <p className="text-xs text-muted-foreground">Unique Customers</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{(stats.avgProcessingTime / 1000).toFixed(1)}s</p>
              <p className="text-xs text-muted-foreground">Avg Response Time</p>
            </div>
            {Object.keys(stats.intentDistribution).length > 0 && (
              <div className="col-span-full">
                <Separator className="my-2" />
                <p className="text-xs font-medium text-muted-foreground mb-2">Intent Distribution</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.intentDistribution).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {Object.keys(stats.intentDistribution).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 60%, 55%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {Object.entries(stats.intentDistribution).map(([intent, count], index) => (
                    <div key={intent} className="flex items-center gap-1.5 text-xs">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: `hsl(${index * 45}, 60%, 55%)` }} />
                      <span className="text-muted-foreground">{intent}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
              {loading ? <Loader2 className="size-3 animate-spin mr-1" /> : <BarChart3 className="size-3 mr-1" />}
              Load Stats
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
