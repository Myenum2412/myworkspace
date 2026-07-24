'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';

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

function StatCard({ item, maxValue, index }: { item: Stats07Item; maxValue: number; index: number }) {
  const percentage = maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0;
  const fill = item.fill || defaultColors[index % defaultColors.length];
  // SVG radial bar — no recharts, no ResizeObserver, no runtime state
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="p-4 shadow-2xs">
      <CardContent className="flex items-center space-x-4 p-0">
        <div className="relative flex items-center justify-center size-20 shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted/50"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={fill}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
}

export default function Stats07({ items, className }: Stats07Props) {
  const maxValue = useMemo(() => Math.max(...items.map((x) => x.value), 1), [items]);

  return (
    <dl className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 ${className ?? ''}`}>
      {items.map((item, i) => (
        <StatCard key={item.name} item={item} maxValue={maxValue} index={i} />
      ))}
    </dl>
  );
}
