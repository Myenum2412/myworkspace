"use client";

import { useState, useEffect, useCallback } from "react";
import { Label, Pie, PieChart, Sector } from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { HardDrive, Database, Check } from "lucide-react";

const PLAN_TIERS = [
  { name: "Free", plan: "free", inr: "₹0", usd: "$0", storage: "10 GB", storageGB: 10 },
  { name: "Growth", plan: "growth", inr: "₹6,000", usd: "$79", storage: "200 GB", storageGB: 200 },
  { name: "Enterprise", plan: "enterprise", inr: "Custom", usd: "Custom", storage: "Contact us", storageGB: 9999 },
];

function formatBytes(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

interface StorageChartProps {
  orgPlan?: string;
}

export function StorageChart({ orgPlan: rawOrgPlan }: StorageChartProps) {
  const orgPlan = rawOrgPlan === "starter" ? "free" : rawOrgPlan === "pro" ? "growth" : rawOrgPlan || "free";
  const [usedMB, setUsedMB] = useState(0);
  const [totalMB, setTotalMB] = useState(1024 * 10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchData() {
      try {
        const statsRes = await fetch("/api/files/stats", { signal: controller.signal });
        if (statsRes.ok) {
          const stats = await statsRes.json();
          const used = stats?.data?.totalSize ?? 0;
          if (!controller.signal.aborted) setUsedMB(used);
        }
      } catch {
        // fallback defaults
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, []);

  const used = Math.min(usedMB, totalMB);
  const remaining = Math.max(0, totalMB - usedMB);
  const pct = totalMB > 0 ? (used / totalMB) * 100 : 0;

  const chartData = [
    { name: "Used", value: used, fill: "var(--color-used)" },
    { name: "Free", value: remaining, fill: "var(--color-free)" },
  ];

  const chartConfig = {
    used: { label: "Used", color: "var(--chart-1)" },
    free: { label: "Free", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const renderShape = useCallback(
    (props: PieSectorShapeProps, index?: string | number) => {
      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, isActive } = props;
      if (isActive) {
        return (
          <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={(outerRadius || 85) + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
            <Sector cx={cx} cy={cy} innerRadius={(outerRadius || 85) + 12} outerRadius={(outerRadius || 85) + 20} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.4} />
          </g>
        );
      }
      return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />;
    },
    []
  );

  const planLabel = PLAN_TIERS.find(t => t.plan === orgPlan)?.name || "Free";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="flex size-10 items-center justify-center rounded-sm bg-primary/10">
          <HardDrive className="size-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-base">Storage</CardTitle>
          <CardDescription>Plan: {planLabel}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          <div className="flex flex-col items-center justify-center">
            {loading ? (
              <div className="flex h-[200px] w-full items-center justify-center text-sm text-muted-foreground">Loading...</div>
            ) : (
              <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-[220px]">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={85}
                    strokeWidth={3}
                    shape={renderShape}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                                {pct.toFixed(0)}%
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">
                                used
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs" style={{ backgroundColor: "var(--chart-1)" }} />
                Used: {formatBytes(usedMB)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs" style={{ backgroundColor: "var(--chart-3)" }} />
                Free: {formatBytes(Math.max(0, totalMB - usedMB))}
              </span>
            </div>
          </div>

          {/* Plan Tiers */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Available Plans</p>
            {PLAN_TIERS.map((tier) => {
              const isActive = orgPlan === tier.plan;
              return (
                <div
                  key={tier.name}
                  className={cn(
                    "flex items-center gap-3 rounded-sm border p-3 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-sm",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isActive ? <Check className="size-4" /> : <Database className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{tier.name}</span>
                      <span className="text-xs font-semibold text-primary">{tier.inr}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tier.storageGB === 9999 ? "Custom storage" : `${tier.storage} storage limit`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
