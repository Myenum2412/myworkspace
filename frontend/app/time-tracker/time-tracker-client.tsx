"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TimeTrackerOverview from "./time-tracker-overview"
import TimeTracker from "./time-tracker-interactive.client"

type Entry = {
  id: string; userId: string; date: string; startTime?: string; endTime?: string;
  duration: number; description: string; projectId?: string; projectName?: string;
  billable: boolean; status: string; createdAt: string;
}

type MyTimeEntry = Entry & { status: "pending" | "approved" | "rejected" }

type TimeReportsViewProps = {
  data: {
    totalHours: number; billableHours: number; totalEntries: number;
    avgDailyHours: number; activeProjects: number; teamMembers: number;
    weeklyChange: number; utilization: number;
    weeklyData: { day: string; hours: number }[];
    topMembers: { rank: number; name: string; hours: number; billable: number }[];
  } | null;
}

function TimeReportsView({ data }: TimeReportsViewProps) {
  const maxHours = data ? Math.max(1, ...data.weeklyData.map((d) => d.hours)) : 1
  const changeDir = (data?.weeklyChange ?? 0) >= 0 ? "up" : "down"

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Time Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Weekly time tracking overview</p>
      </div>

      {!data ? (
        <div className="flex items-center justify-center py-20">
          <span className="ml-2 text-sm text-muted-foreground">No data available.</span>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-row items-center justify-between pb-2 p-6">
                <h3 className="tracking-tight text-sm font-medium">Total Hours</h3>
              </div>
              <div className="p-6 pt-0">
                <div className="text-2xl font-bold">{data.totalHours.toFixed(1)}</div>
                <div className={`flex items-center gap-1 text-xs mt-1 ${changeDir === "up" ? "text-green-600" : "text-rose-600"}`}>
                  {Math.abs(data.weeklyChange).toFixed(1)}% vs last week
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-row items-center justify-between pb-2 p-6">
                <h3 className="tracking-tight text-sm font-medium">Billable Hours</h3>
              </div>
              <div className="p-6 pt-0">
                <div className="text-2xl font-bold">{data.billableHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-1">{data.utilization}% utilization rate</p>
              </div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-row items-center justify-between pb-2 p-6">
                <h3 className="tracking-tight text-sm font-medium">Active Projects</h3>
              </div>
              <div className="p-6 pt-0">
                <div className="text-2xl font-bold">{data.activeProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">{data.teamMembers} team members</p>
              </div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-row items-center justify-between pb-2 p-6">
                <h3 className="tracking-tight text-sm font-medium">Daily Average</h3>
              </div>
              <div className="p-6 pt-0">
                <div className="text-2xl font-bold">{data.avgDailyHours}h</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">per team member</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="p-6">
                <h3 className="font-semibold leading-none tracking-tight text-sm">Weekly Hours</h3>
              </div>
              <div className="p-6 pt-0">
                <div className="flex items-end gap-2 h-32">
                  {data.weeklyData.map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                        style={{ height: `${(d.hours / maxHours) * 100}%` }}
                      />
                      <span className="text-xs text-muted-foreground">{d.hours.toFixed(0)}</span>
                      <span className="text-xs font-medium">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="p-6">
                <h3 className="font-semibold leading-none tracking-tight text-sm">Top Contributors</h3>
              </div>
              <div className="p-6 pt-0">
                <div className="space-y-3">
                  {data.topMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No entries this week.</p>
                  ) : (
                    data.topMembers.map((m) => (
                      <div key={m.rank} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-4">#{m.rank}</span>
                          <span className="text-sm">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{m.hours.toFixed(1)}h</span>
                          <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">{m.billable.toFixed(1)}h billable</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

type Props = {
  overviewData: Entry[] | null
  myTimeData: { entries: MyTimeEntry[]; projects: { id: string; name: string; color: string }[]; user: { name: string; email: string; avatar: string; id: string }; orgId: string } | null
  reportsData: TimeReportsViewProps["data"]
}

export default function TimeTrackerClient({ overviewData, myTimeData, reportsData }: Props) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
        <TabsTrigger value="overview" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Overview</TabsTrigger>
        <TabsTrigger value="my-time" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">My Time</TabsTrigger>
        <TabsTrigger value="reports" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Time Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-4">
        <TimeTrackerOverview data={overviewData} />
      </TabsContent>
      <TabsContent value="my-time" className="mt-4">
        {myTimeData ? (
          <TimeTracker
            user={myTimeData.user}
            orgId={myTimeData.orgId}
            initialEntries={myTimeData.entries}
            projects={myTimeData.projects}
          />
        ) : (
          <TimeTracker user={{ name: "", email: "", avatar: "", id: "" }} orgId="" initialEntries={[]} projects={[]} />
        )}
      </TabsContent>
      <TabsContent value="reports" className="mt-4">
        <TimeReportsView data={reportsData} />
      </TabsContent>
    </Tabs>
  )
}
