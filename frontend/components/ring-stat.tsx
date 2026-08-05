'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

type RingStatProps = {
  value: number;
  max: number;
  label: string;
  fill?: string;
  size?: number;
  className?: string;
};

const chartConfig = {
  capacity: {
    label: 'Capacity',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function RingStat({ value, max, label, fill = 'var(--chart-1)', size = 44, className }: RingStatProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const innerRadius = Math.round(size * 0.55);
  const outerRadius = Math.round(size / 2);

  return (
    <div className={cn('flex items-center gap-2 shrink-0', className)}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <ChartContainer className="h-full w-full" config={chartConfig}>
          <RadialBarChart
            barSize={4}
            data={[{ capacity: percentage, fill }]}
            endAngle={-270}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
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
              cornerRadius={8}
              dataKey="capacity"
              fill={fill}
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[11px] font-semibold tabular-nums leading-none text-foreground">
            {value}
          </span>
        </div>
      </div>
      <span className="max-w-[72px] text-xs leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}
