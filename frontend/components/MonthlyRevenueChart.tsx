"use client"

import { CSSProperties } from "react"
import { Badge } from "@/components/reui/badge"
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { TrendingUpIcon } from "lucide-react"

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function MonthlyRevenueChart({
  data,
}: {
  data: { month: string; revenue: number }[]
}) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0)
  const avg = data.length ? Math.round(total / data.length) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Monthly Revenue
          {data.length >= 2 && (
            <Badge variant="success-light" className="ml-2">
              <TrendingUpIcon aria-hidden="true" />
              {data[data.length - 1].revenue > data[0].revenue ? "+" : ""}
              {Math.round(
                ((data[data.length - 1].revenue - data[0].revenue) /
                  data[0].revenue) *
                  100,
              )}
              %
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {formatCurrency(total)} total &middot; {formatCurrency(avg)} avg/month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ top: 20, right: 2, bottom: 0, left: 2 }}
          >
            <defs>
              <linearGradient id="chart16-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0}
                />
              </linearGradient>
              <filter
                id="chart16-dot-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter
                id="chart16-line-glow"
                x="-10%"
                y="-20%"
                width="120%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  className="min-w-36 gap-2.5"
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-xs bg-(--color-bg)"
                          style={
                            {
                              "--color-bg": `var(--color-${name})`,
                            } as CSSProperties
                          }
                        />
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]
                            ?.label || name}
                        </span>
                      </div>
                      <span className="text-foreground font-semibold tabular-nums">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Area
              dataKey="revenue"
              type="natural"
              fill="url(#chart16-fill)"
              stroke="var(--color-revenue)"
              strokeWidth={2}
              filter="url(#chart16-line-glow)"
              dot={{
                r: 4,
                fill: "var(--color-revenue)",
                strokeWidth: 2,
                stroke: "var(--background)",
                filter: "url(#chart16-dot-glow)",
              }}
              activeDot={{ r: 6, strokeWidth: 3, stroke: "var(--background)" }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
