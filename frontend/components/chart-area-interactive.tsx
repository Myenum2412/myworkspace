"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const chartData = [
  { date: "2024-04-01", active: 42, hires: 3 },
  { date: "2024-04-02", active: 44, hires: 5 },
  { date: "2024-04-03", active: 43, hires: 2 },
  { date: "2024-04-04", active: 45, hires: 4 },
  { date: "2024-04-05", active: 47, hires: 6 },
  { date: "2024-04-06", active: 48, hires: 2 },
  { date: "2024-04-07", active: 46, hires: 1 },
  { date: "2024-04-08", active: 48, hires: 3 },
  { date: "2024-04-09", active: 49, hires: 4 },
  { date: "2024-04-10", active: 51, hires: 5 },
  { date: "2024-04-11", active: 52, hires: 3 },
  { date: "2024-04-12", active: 53, hires: 4 },
  { date: "2024-04-13", active: 52, hires: 2 },
  { date: "2024-04-14", active: 54, hires: 3 },
  { date: "2024-04-15", active: 53, hires: 1 },
  { date: "2024-04-16", active: 55, hires: 4 },
  { date: "2024-04-17", active: 57, hires: 5 },
  { date: "2024-04-18", active: 58, hires: 3 },
  { date: "2024-04-19", active: 56, hires: 2 },
  { date: "2024-04-20", active: 58, hires: 4 },
  { date: "2024-04-21", active: 59, hires: 3 },
  { date: "2024-04-22", active: 61, hires: 5 },
  { date: "2024-04-23", active: 60, hires: 2 },
  { date: "2024-04-24", active: 62, hires: 4 },
  { date: "2024-04-25", active: 64, hires: 3 },
  { date: "2024-04-26", active: 63, hires: 1 },
  { date: "2024-04-27", active: 65, hires: 5 },
  { date: "2024-04-28", active: 64, hires: 2 },
  { date: "2024-04-29", active: 66, hires: 4 },
  { date: "2024-04-30", active: 68, hires: 6 },
  { date: "2024-05-01", active: 67, hires: 2 },
  { date: "2024-05-02", active: 69, hires: 4 },
  { date: "2024-05-03", active: 70, hires: 3 },
  { date: "2024-05-04", active: 72, hires: 5 },
  { date: "2024-05-05", active: 73, hires: 3 },
  { date: "2024-05-06", active: 75, hires: 6 },
  { date: "2024-05-07", active: 74, hires: 2 },
  { date: "2024-05-08", active: 76, hires: 4 },
  { date: "2024-05-09", active: 77, hires: 3 },
  { date: "2024-05-10", active: 79, hires: 5 },
  { date: "2024-05-11", active: 80, hires: 4 },
  { date: "2024-05-12", active: 81, hires: 2 },
  { date: "2024-05-13", active: 80, hires: 3 },
  { date: "2024-05-14", active: 82, hires: 5 },
  { date: "2024-05-15", active: 84, hires: 4 },
  { date: "2024-05-16", active: 85, hires: 3 },
  { date: "2024-05-17", active: 87, hires: 6 },
  { date: "2024-05-18", active: 86, hires: 2 },
  { date: "2024-05-19", active: 85, hires: 1 },
  { date: "2024-05-20", active: 87, hires: 4 },
  { date: "2024-05-21", active: 88, hires: 3 },
  { date: "2024-05-22", active: 89, hires: 4 },
  { date: "2024-05-23", active: 91, hires: 5 },
  { date: "2024-05-24", active: 92, hires: 3 },
  { date: "2024-05-25", active: 93, hires: 4 },
  { date: "2024-05-26", active: 92, hires: 2 },
  { date: "2024-05-27", active: 94, hires: 5 },
  { date: "2024-05-28", active: 93, hires: 3 },
  { date: "2024-05-29", active: 95, hires: 4 },
  { date: "2024-05-30", active: 97, hires: 6 },
  { date: "2024-05-31", active: 98, hires: 3 },
  { date: "2024-06-01", active: 99, hires: 4 },
  { date: "2024-06-02", active: 101, hires: 5 },
  { date: "2024-06-03", active: 100, hires: 2 },
  { date: "2024-06-04", active: 102, hires: 4 },
  { date: "2024-06-05", active: 103, hires: 3 },
  { date: "2024-06-06", active: 105, hires: 5 },
  { date: "2024-06-07", active: 106, hires: 4 },
  { date: "2024-06-08", active: 108, hires: 6 },
  { date: "2024-06-09", active: 109, hires: 3 },
  { date: "2024-06-10", active: 110, hires: 5 },
  { date: "2024-06-11", active: 109, hires: 2 },
  { date: "2024-06-12", active: 111, hires: 4 },
  { date: "2024-06-13", active: 110, hires: 3 },
  { date: "2024-06-14", active: 112, hires: 5 },
  { date: "2024-06-15", active: 113, hires: 4 },
  { date: "2024-06-16", active: 115, hires: 6 },
  { date: "2024-06-17", active: 116, hires: 3 },
  { date: "2024-06-18", active: 117, hires: 4 },
  { date: "2024-06-19", active: 118, hires: 5 },
  { date: "2024-06-20", active: 120, hires: 6 },
  { date: "2024-06-21", active: 119, hires: 2 },
  { date: "2024-06-22", active: 121, hires: 4 },
  { date: "2024-06-23", active: 123, hires: 5 },
  { date: "2024-06-24", active: 122, hires: 3 },
  { date: "2024-06-25", active: 124, hires: 4 },
  { date: "2024-06-26", active: 125, hires: 5 },
  { date: "2024-06-27", active: 127, hires: 6 },
  { date: "2024-06-28", active: 126, hires: 2 },
  { date: "2024-06-29", active: 128, hires: 4 },
  { date: "2024-06-30", active: 130, hires: 5 },
]

const chartConfig = {
  employees: {
    label: "Employees",
  },
  active: {
    label: "Active Employees",
    color: "var(--chart-1)",
  },
  hires: {
    label: "New Hires",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = React.useState("90d")

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Employee Growth</CardTitle>
          <CardDescription>
            Active employees and new hires over the last 3 months
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-active)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-active)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillHires" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-hires)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-hires)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="hires"
              type="natural"
              fill="url(#fillHires)"
              stroke="var(--color-hires)"
              stackId="a"
            />
            <Area
              dataKey="active"
              type="natural"
              fill="url(#fillActive)"
              stroke="var(--color-active)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
