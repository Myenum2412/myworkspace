"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TeamStatsCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
};

export function TeamStatsCard({ icon, label, value, valueClassName }: TeamStatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          {icon}{label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
