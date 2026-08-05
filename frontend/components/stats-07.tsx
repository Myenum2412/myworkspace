'use client';

import { useMemo } from 'react';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';

export type Stats07Item = {
  name: string;
  value: number;
  subtitle?: string;
  fill?: string;
};

type Stats07Props = {
  items: Stats07Item[];
  className?: string;
};

const defaultColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const chartConfig = {
  capacity: {
    label: 'Capacity',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

function StatCard({ item, maxValue, index }: { item: Stats07Item; maxValue: number; index: number }) {
  const percentage = maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0;
  const fill = item.fill || defaultColors[index % defaultColors.length];

  return (
    <Card className="p-4 h-full border bg-card shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md overflow-hidden surface-hover">
      <CardContent className="flex items-center gap-4 p-0">
        <div className="relative flex items-center justify-center shrink-0">
          <ChartContainer className="h-[64px] w-[64px] sm:h-[72px] sm:w-[72px]" config={chartConfig}>
            <RadialBarChart
              barSize={6}
              data={[{ capacity: percentage, fill }]}
              endAngle={-270}
              innerRadius={24}
              outerRadius={40}
              startAngle={90}
            >
              <PolarAngleAxis
                angleAxisId={0}
                axisLine={false}
                domain={[0, 100]}
                tick={false}
                type="number"
              />
              <RadialBar
                angleAxisId={0}
                background
                cornerRadius={12}
                dataKey="capacity"
                fill={fill}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-base sm:text-lg font-semibold tabular-nums tracking-tight text-foreground">
              {item.value}
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <dt className="truncate text-sm font-medium text-foreground">
            {item.name}
          </dt>
          {item.subtitle && (
            <dd className="truncate text-xs text-muted-foreground mt-0.5">
              {item.subtitle}
            </dd>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Stats07({ items, className }: Stats07Props) {
  const maxValue = useMemo(() => Math.max(...items.map((x) => x.value), 1), [items]);

  return (
    <dl className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 ${className ?? ''}`}>
      {items.map((item, i) => (
        <StatCard key={item.name} item={item} maxValue={maxValue} index={i} />
      ))}
    </dl>
  );
}
