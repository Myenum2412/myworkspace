'use client';

import { Card, CardContent } from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';

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

export default function Stats07({ items, className }: Stats07Props) {
  return (
    <dl className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 ${className ?? ''}`}>
      {items.map((item, i) => {
        const maxValue = Math.max(...items.map((x) => x.value), 1);
        const percentage = maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0;
        const fill = item.fill || defaultColors[i % defaultColors.length];

        return (
          <Card key={item.name} className="p-4 shadow-2xs">
            <CardContent className="flex items-center space-x-4 p-0">
              <div className="relative flex items-center justify-center">
                <ChartContainer
                  className="h-[80px] w-[80px]"
                  config={chartConfig}
                >
                  <RadialBarChart
                    barSize={6}
                    data={[{ capacity: percentage }]}
                    endAngle={-270}
                    innerRadius={30}
                    outerRadius={60}
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-medium text-base text-foreground">
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
      })}
    </dl>
  );
}
