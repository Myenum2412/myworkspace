"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

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

const rawData = [
  { date: "2024-04-01", desktop: 222, employees: 150 },
  { date: "2024-04-02", desktop: 97, employees: 180 },
  { date: "2024-04-03", desktop: 167, employees: 120 },
  { date: "2024-04-04", desktop: 242, employees: 260 },
  { date: "2024-04-05", desktop: 373, employees: 290 },
  { date: "2024-04-06", desktop: 301, employees: 340 },
  { date: "2024-04-07", desktop: 245, employees: 180 },
  { date: "2024-04-08", desktop: 409, employees: 320 },
  { date: "2024-04-09", desktop: 59, employees: 110 },
  { date: "2024-04-10", desktop: 261, employees: 190 },
  { date: "2024-04-11", desktop: 327, employees: 350 },
  { date: "2024-04-12", desktop: 292, employees: 210 },
  { date: "2024-04-13", desktop: 342, employees: 380 },
  { date: "2024-04-14", desktop: 137, employees: 220 },
  { date: "2024-04-15", desktop: 120, employees: 170 },
  { date: "2024-04-16", desktop: 138, employees: 190 },
  { date: "2024-04-17", desktop: 446, employees: 360 },
  { date: "2024-04-18", desktop: 364, employees: 410 },
  { date: "2024-04-19", desktop: 243, employees: 180 },
  { date: "2024-04-20", desktop: 89, employees: 150 },
  { date: "2024-04-21", desktop: 137, employees: 200 },
  { date: "2024-04-22", desktop: 224, employees: 170 },
  { date: "2024-04-23", desktop: 138, employees: 230 },
  { date: "2024-04-24", desktop: 387, employees: 290 },
  { date: "2024-04-25", desktop: 215, employees: 250 },
  { date: "2024-04-26", desktop: 75, employees: 130 },
  { date: "2024-04-27", desktop: 383, employees: 420 },
  { date: "2024-04-28", desktop: 122, employees: 180 },
  { date: "2024-04-29", desktop: 315, employees: 240 },
  { date: "2024-04-30", desktop: 454, employees: 380 },
  { date: "2024-05-01", desktop: 165, employees: 220 },
  { date: "2024-05-02", desktop: 293, employees: 310 },
  { date: "2024-05-03", desktop: 247, employees: 190 },
  { date: "2024-05-04", desktop: 385, employees: 420 },
  { date: "2024-05-05", desktop: 481, employees: 390 },
  { date: "2024-05-06", desktop: 498, employees: 520 },
  { date: "2024-05-07", desktop: 388, employees: 300 },
  { date: "2024-05-08", desktop: 149, employees: 210 },
  { date: "2024-05-09", desktop: 227, employees: 180 },
  { date: "2024-05-10", desktop: 293, employees: 330 },
  { date: "2024-05-11", desktop: 335, employees: 270 },
  { date: "2024-05-12", desktop: 197, employees: 240 },
  { date: "2024-05-13", desktop: 197, employees: 160 },
  { date: "2024-05-14", desktop: 448, employees: 490 },
  { date: "2024-05-15", desktop: 473, employees: 380 },
  { date: "2024-05-16", desktop: 338, employees: 400 },
  { date: "2024-05-17", desktop: 499, employees: 420 },
  { date: "2024-05-18", desktop: 315, employees: 350 },
  { date: "2024-05-19", desktop: 235, employees: 180 },
  { date: "2024-05-20", desktop: 177, employees: 230 },
  { date: "2024-05-21", desktop: 82, employees: 140 },
  { date: "2024-05-22", desktop: 81, employees: 120 },
  { date: "2024-05-23", desktop: 252, employees: 290 },
  { date: "2024-05-24", desktop: 294, employees: 220 },
  { date: "2024-05-25", desktop: 201, employees: 250 },
  { date: "2024-05-26", desktop: 213, employees: 170 },
  { date: "2024-05-27", desktop: 420, employees: 460 },
  { date: "2024-05-28", desktop: 233, employees: 190 },
  { date: "2024-05-29", desktop: 78, employees: 130 },
  { date: "2024-05-30", desktop: 340, employees: 280 },
  { date: "2024-05-31", desktop: 178, employees: 230 },
  { date: "2024-06-01", desktop: 178, employees: 200 },
  { date: "2024-06-02", desktop: 470, employees: 410 },
  { date: "2024-06-03", desktop: 103, employees: 160 },
  { date: "2024-06-04", desktop: 439, employees: 380 },
  { date: "2024-06-05", desktop: 88, employees: 140 },
  { date: "2024-06-06", desktop: 294, employees: 250 },
  { date: "2024-06-07", desktop: 323, employees: 370 },
  { date: "2024-06-08", desktop: 385, employees: 320 },
  { date: "2024-06-09", desktop: 438, employees: 480 },
  { date: "2024-06-10", desktop: 155, employees: 200 },
  { date: "2024-06-11", desktop: 92, employees: 150 },
  { date: "2024-06-12", desktop: 492, employees: 420 },
  { date: "2024-06-13", desktop: 81, employees: 130 },
  { date: "2024-06-14", desktop: 426, employees: 380 },
  { date: "2024-06-15", desktop: 307, employees: 350 },
  { date: "2024-06-16", desktop: 371, employees: 310 },
  { date: "2024-06-17", desktop: 475, employees: 520 },
  { date: "2024-06-18", desktop: 107, employees: 170 },
  { date: "2024-06-19", desktop: 341, employees: 290 },
  { date: "2024-06-20", desktop: 408, employees: 450 },
  { date: "2024-06-21", desktop: 169, employees: 210 },
  { date: "2024-06-22", desktop: 317, employees: 270 },
  { date: "2024-06-23", desktop: 480, employees: 530 },
  { date: "2024-06-24", desktop: 132, employees: 180 },
  { date: "2024-06-25", desktop: 141, employees: 190 },
  { date: "2024-06-26", desktop: 434, employees: 380 },
  { date: "2024-06-27", desktop: 448, employees: 490 },
  { date: "2024-06-28", desktop: 149, employees: 200 },
  { date: "2024-06-29", desktop: 103, employees: 160 },
  { date: "2024-06-30", desktop: 446, employees: 400 },
];

const DATA_SCALE = 22;
const chartData = rawData.map((d) => ({
  ...d,
  desktop: Math.round(d.desktop / DATA_SCALE),
  employees: Math.round(d.employees / DATA_SCALE),
}));

const chartConfig = {
  views: {
    label: "Hours",
  },
  desktop: {
    label: "Desktop",
    color: "var(--chart-2)",
  },
  employees: {
    label: "Employees",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const HOURS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

export function ChartBarInteractive() {
  type ChartKey = "desktop" | "employees";
  const [activeChart, setActiveChart] =
    React.useState<ChartKey>("desktop");
  const [selectedHour, setSelectedHour] = React.useState<number | null>(null);

  const total = React.useMemo(
    () => ({
      desktop: chartData.reduce((acc, curr) => acc + curr.desktop, 0),
      employees: chartData.reduce((acc, curr) => acc + curr.employees, 0),
    }),
    []
  );

  const displayData = React.useMemo(() => {
    if (selectedHour === null)
      return chartData.map((d) => ({ ...d, _selected: true }));
    const min = selectedHour - 2;
    return chartData.map((d) => ({
      ...d,
      _selected: d[activeChart] >= min && d[activeChart] < selectedHour,
    }));
  }, [selectedHour, activeChart]);

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0!">
          <CardTitle>Time Tracker</CardTitle>
          <CardDescription>
            Hours tracked per day for the last 3 months
          </CardDescription>
        </div>
        <div className="flex">
          {(["desktop", "employees"] as const).map((chart) => {
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {total[chart].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <div className="flex gap-4">
          <div className="flex flex-col gap-0.5 pt-8">
            {HOURS.toReversed().map((hour) => (
              <button
                key={hour}
                onClick={() =>
                  setSelectedHour(
                    selectedHour === hour ? null : hour
                  )
                }
                className={cn(
                  "flex h-5 items-center justify-end rounded px-2 text-xs leading-none transition-colors",
                  selectedHour === hour
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {hour}h
              </button>
            ))}
          </div>
          <div className="flex-1">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={displayData}
                margin={{
                  left: 0,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis hide domain={[0, 24]} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[150px]"
                      nameKey="views"
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                    />
                  }
                />
                <Bar
                  dataKey={activeChart}
                  fill={`var(--color-${activeChart})`}
                >
                  {displayData.map((entry, index) => (
                    <Cell
                      key={index}
                      fillOpacity={entry._selected ? 1 : 0.2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
