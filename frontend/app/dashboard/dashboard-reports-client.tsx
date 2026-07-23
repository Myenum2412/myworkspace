"use client"

import type { ReportsData } from "./page"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BarChart3Icon } from "lucide-react"

type Props = {
  reportsData: ReportsData | null
}

export function DashboardReportsClient({ reportsData }: Props) {
  const rTotal = reportsData?.total || 0
  const priorityBreakdown = reportsData?.priorityBreakdown || []
  const statusBreakdown = reportsData?.statusBreakdown || []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BarChart3Icon className="size-6 shrink-0" />
        <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Priority Breakdown</CardTitle></CardHeader>
          <CardContent>
            {rTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No task data available.</p>
            ) : (
              <div className="space-y-3">
                {priorityBreakdown.map((p) => (
                  <div key={p.label} className="flex items-center gap-3">
                    <div className={`size-3 rounded-full ${p.color}`} />
                    <span className="text-sm flex-1">{p.label}</span>
                    <span className="text-sm font-bold">{p.count}</span>
                    <div className="w-24 h-2 rounded-sm bg-muted">
                      <div className={`h-2 rounded-sm ${p.color}`} style={{ width: `${rTotal > 0 ? (p.count / rTotal) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status Overview</CardTitle></CardHeader>
          <CardContent>
            {rTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No task data available.</p>
            ) : (
              <div className="space-y-3">
                {statusBreakdown.map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className={`size-3 rounded-full ${s.color}`} />
                    <span className="text-sm flex-1">{s.label}</span>
                    <span className="text-sm font-bold">{s.count}</span>
                    <div className="w-24 h-2 rounded-sm bg-muted">
                      <div className={`h-2 rounded-sm ${s.color}`} style={{ width: `${rTotal > 0 ? (s.count / rTotal) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
