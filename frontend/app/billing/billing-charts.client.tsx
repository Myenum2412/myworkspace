"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Invoice {
  id: string;
  number: string;
  amountPaid: number;
  currency: string;
  status: string;
  pdfUrl: string;
  hostedUrl: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
}

interface BillingChartsProps {
  invoices: Invoice[];
  pieData: { name: string; value: number; color: string }[];
}

export default function BillingCharts({ invoices, pieData }: BillingChartsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Payment Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              No invoice data to display
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-row sm:flex-col gap-3 sm:gap-2 flex-wrap justify-center">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-medium ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              No invoice data to display
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={(() => {
                  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const months: Record<number, { name: string; paid: number; pending: number }> = {};

                  // Initialize all 12 months
                  for (let i = 0; i < 12; i++) {
                    months[i] = { name: monthNames[i], paid: 0, pending: 0 };
                  }

                  // Aggregate invoice data by month
                  invoices.forEach((inv) => {
                    const d = new Date(inv.createdAt);
                    const monthIndex = d.getMonth();
                    if (inv.status === "paid") months[monthIndex].paid += (inv.amountPaid || 0) / 100;
                    else if (inv.status === "open") months[monthIndex].pending += (inv.amountPaid || 0) / 100;
                  });

                  return Object.values(months);
                })()}
                barCategoryGap="20%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="paid" fill="#22c55e" name="Paid" radius={[3, 3, 0, 0]} barSize={12} />
                <Bar dataKey="pending" fill="#3b82f6" name="Pending" radius={[3, 3, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
