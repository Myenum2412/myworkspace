"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TrendingUp, FilterIcon, XIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

const allData: Record<string, { day: string; hours: number }[]> = {
  "January-2026": [
    { day: "Week 1", hours: 28 },
    { day: "Week 2", hours: 32 },
    { day: "Week 3", hours: 25 },
    { day: "Week 4", hours: 30 },
  ],
  "February-2026": [
    { day: "Week 1", hours: 26 },
    { day: "Week 2", hours: 30 },
    { day: "Week 3", hours: 28 },
    { day: "Week 4", hours: 22 },
  ],
  "March-2026": [
    { day: "Week 1", hours: 30 },
    { day: "Week 2", hours: 28 },
    { day: "Week 3", hours: 35 },
    { day: "Week 4", hours: 27 },
  ],
  "April-2026": [
    { day: "Week 1", hours: 24 },
    { day: "Week 2", hours: 29 },
    { day: "Week 3", hours: 31 },
    { day: "Week 4", hours: 26 },
  ],
  "May-2026": [
    { day: "Week 1", hours: 30 },
    { day: "Week 2", hours: 33 },
    { day: "Week 3", hours: 28 },
    { day: "Week 4", hours: 31 },
  ],
  "June-2026": [
    { day: "Monday", hours: 6.5 },
    { day: "Tuesday", hours: 7.2 },
    { day: "Wednesday", hours: 5.8 },
    { day: "Thursday", hours: 8 },
    { day: "Friday", hours: 4.5 },
    { day: "Saturday", hours: 2 },
    { day: "Sunday", hours: 0 },
  ],
};

const defaultKey = "June-2026";

const chartConfig = {
  hours: {
    label: "Hours",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const years = ["2024", "2025", "2026", "2027"];

export default function TimeTrackerPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [selectedMonth, setSelectedMonth] = useState("June");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [showFilter, setShowFilter] = useState(false);
  const [tempMonth, setTempMonth] = useState("June");
  const [tempYear, setTempYear] = useState("2026");

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  const dataKey = `${selectedMonth}-${selectedYear}`;
  const chartData = allData[dataKey] || allData[defaultKey];

  const totalHours = chartData.reduce((sum, d) => sum + d.hours, 0);
  const activeDays = chartData.filter((d) => d.hours > 0).length;
  const avgHours = activeDays > 0 ? (totalHours / activeDays).toFixed(1) : "0";

  function applyFilter() {
    setSelectedMonth(tempMonth);
    setSelectedYear(tempYear);
    setShowFilter(false);
  }

  function resetFilter() {
    setTempMonth("June");
    setTempYear("2026");
    setSelectedMonth("June");
    setSelectedYear("2026");
    setShowFilter(false);
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-6 p-6">
          <h1 className="text-2xl font-bold tracking-tight">Time Tracker</h1>

          <Card>
            <CardHeader>
              <CardTitle>Hours Tracked</CardTitle>
              <CardDescription>{selectedMonth} {selectedYear}</CardDescription>
              <CardAction>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => {
                    setTempMonth(selectedMonth);
                    setTempYear(selectedYear);
                    setShowFilter(true);
                  }}
                >
                  <FilterIcon className="size-3.5" />
                  Filter
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[220px]">
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    unit="h"
                    ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="hours" fill="var(--color-hours)" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="flex gap-2 leading-none font-medium">
                {totalHours}h total tracked <TrendingUp className="size-4" />
              </div>
              <div className="leading-none text-muted-foreground">
                {activeDays} active days &middot; {avgHours}h daily avg
              </div>
            </CardFooter>
          </Card>
        </main>

        {showFilter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowFilter(false)}>
            <div className="w-full max-w-xs rounded-xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Filter hours</h2>
                <button
                  onClick={() => setShowFilter(false)}
                  className="rounded-md p-1 hover:bg-muted transition-colors"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Month</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {months.map((m) => (
                      <button
                        key={m}
                        onClick={() => setTempMonth(m)}
                        className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                          tempMonth === m
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        {m.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Year</label>
                  <div className="flex gap-2">
                    {years.map((y) => (
                      <button
                        key={y}
                        onClick={() => setTempYear(y)}
                        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          tempYear === y
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={resetFilter}>
                    Reset
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={applyFilter}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
