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
    <Card className="p-3 shadow-2xs h-full">
      <CardContent className="flex items-center justify-center space-x-3 p-0">
        <div className="relative flex items-center justify-center shrink-0">
          <ChartContainer className="h-[64px] w-[64px]" config={chartConfig}>
            <RadialBarChart
              barSize={5}
              data={[{ capacity: percentage, fill }]}
              endAngle={-270}
              innerRadius={24}
              outerRadius={48}
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
                cornerRadius={10}
                dataKey="capacity"
                fill={fill}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-medium text-sm text-foreground">
              {item.value}
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <dt className="font-medium text-foreground text-sm truncate">
            {item.name}
          </dt>
          {item.subtitle && (
            <dd className="text-muted-foreground text-xs truncate">
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
    <dl className={`flex flex-row items-stretch gap-3 overflow-x-auto pb-1 ${className ?? ''}`}>
      {items.map((item, i) => (
        <div key={item.name} className="flex-1 min-w-[160px]">
          <StatCard item={item} maxValue={maxValue} index={i} />
        </div>
      ))}
    </dl>
  );
}
