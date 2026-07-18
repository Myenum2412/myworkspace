"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart } from "@/components/charts/line-chart";
import { ProfitLossLine } from "@/components/charts/profit-loss-line";
import { ProfitLossLegend } from "@/components/charts/profit-loss-legend";
import { ProfitLossLegendHoverProvider } from "@/components/charts/profit-loss-legend-hover";
import { ChartTooltip, type TooltipRow } from "@/components/charts/tooltip";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { cn } from "@/lib/utils";

export type ProfitLossRow = {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
  projectsCreated: number;
  tasksCompleted: number;
  memberCount: number;
};

interface Props {
  data: ProfitLossRow[];
  className?: string;
}

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function costToRows(point: Record<string, unknown>): TooltipRow[] {
  const profit = point.profit as number;
  return [
    { label: "Revenue", value: currencyFmt.format(point.revenue as number), color: "var(--color-emerald-500)" },
    { label: "Expenses", value: currencyFmt.format(point.expenses as number), color: "var(--color-red-500)" },
    { label: "Profit", value: currencyFmt.format(profit), color: profit >= 0 ? "var(--color-emerald-500)" : "var(--color-red-500)" },
  ];
}

export function ProfitLossChart({ data, className }: Props) {
  const [legendHover, setLegendHover] = useState<number | null>(null);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: new Date(d.date),
        profit: d.profit,
        revenue: d.revenue,
        expenses: d.expenses,
      })),
    [data]
  );

  if (data.length === 0) {
    return (
      <Card className={cn("flex flex-col", className)}>
        <CardHeader>
          <CardTitle className="text-base">Profit & Loss</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Profit & Loss</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ProfitLossLegendHoverProvider hoveredIndex={legendHover}>
          <LineChart
            data={chartData}
            xDataKey="date"
            aspectRatio="3 / 1"
            margin={{ top: 16, right: 16, bottom: 20, left: 16 }}
          >
            <Grid horizontal={false} vertical={false} highlightRowValues={[0]} />
            <ProfitLossLine dataKey="profit" strokeWidth={2.5} />
            <ChartTooltip
              rows={costToRows}
              showDatePill
              dotColor={(_, line) => {
                const point = chartData.find((d) => d.profit !== undefined);
                if (!point) return "var(--foreground)";
                return point.profit >= 0 ? "var(--color-emerald-500)" : "var(--color-red-500)";
              }}
            />
            <XAxis numTicks={6} tickMode="data" />
            <ProfitLossLegend hoveredIndex={legendHover} onHoverChange={setLegendHover} />
          </LineChart>
        </ProfitLossLegendHoverProvider>
      </CardContent>
    </Card>
  );
}

export function ProfitLossChartSkeleton({ className }: { className?: string }) {
  return null;
}
