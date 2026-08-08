"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TrendingUp } from "@/lib/icons";

const chartConfig = {
  users: {
    label: "Users",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function NewUsersChart({ data }: { data: { state: string; users: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users by State</CardTitle>
        <CardDescription>Distribution of users across states</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: -20 }}>
            <XAxis type="number" dataKey="users" hide />
            <YAxis
              dataKey="state"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={80}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="users" fill="var(--color-users)" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          <TrendingUp className="h-4 w-4" />
          User count by state
        </div>
      </CardFooter>
    </Card>
  );
}
