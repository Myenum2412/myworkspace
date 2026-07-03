"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircleIcon } from "lucide-react";

export type PriorityData = {
  name: string;
  value: number;
};

const COLORS: Record<string, string> = {
  low: "#9ca3af", // gray-400
  medium: "#3b82f6", // blue-500
  high: "#f97316", // orange-500
  urgent: "#ef4444", // red-500
  unassigned: "#e5e7eb", // gray-200
};

export function PriorityBreakdownChart({ data, className }: { data: PriorityData[]; className?: string }) {
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircleIcon className="size-4" /> Priority Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
          No priority data available
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map(d => ({
    name: d.name.charAt(0).toUpperCase() + d.name.slice(1),
    value: d.value,
    originalName: d.name
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircleIcon className="size-4" /> Priority Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.originalName.toLowerCase()] || COLORS.unassigned} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
