"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
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

const chartData = [
  { day: "Monday", hours: 6.5 },
  { day: "Tuesday", hours: 7.2 },
  { day: "Wednesday", hours: 5.8 },
  { day: "Thursday", hours: 8 },
  { day: "Friday", hours: 4.5 },
  { day: "Saturday", hours: 2 },
  { day: "Sunday", hours: 0 },
];

const chartConfig = {
  hours: {
    label: "Hours",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function TimeTrackerPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  const totalHours = chartData.reduce((sum, d) => sum + d.hours, 0);

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
              <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <div className="min-w-[1000px]">
                  <ChartContainer config={chartConfig} className="h-[300px] pb-4">
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        unit="h"
                      />
                      <ChartTooltip
                        cursor={{ fill: 'var(--muted)' }}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="flex gap-2 leading-none font-medium">
                {totalHours}h total tracked this week <TrendingUp className="size-4" />
              </div>
              <div className="leading-none text-muted-foreground">
                {chartData.filter((d) => d.hours > 0).length} active days
              </div>
            </CardFooter>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
