"use client"

import { useMemo } from "react"
import type { DashboardData, ReportsData } from "./page"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  ListTodo, CheckCircle2, Clock, AlertCircle,
  CalendarIcon, HourglassIcon, Users, FolderKanbanIcon, Building2Icon,
  IndianRupeeIcon, ArrowRightIcon, BarChart3Icon, TrendingUpIcon,
  ArrowUpIcon, ArrowDownIcon,
} from "lucide-react"
import Link from "next/link"
import DashboardCalendarPopup from "@/components/dashboard-calendar-popup"

const ROWS_PER_CARD = 5

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

const statusStyles: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  online: "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  offline: "bg-gray-100 text-gray-700",
  on_leave: "bg-amber-50 text-amber-700",
}

function ViewMoreFooter({ href, label = "View More" }: { href: string; label?: string }) {
  return (
    <div className="flex justify-end pt-2 mt-2 border-t border-border shrink-0">
      <Button asChild variant="outline" size="sm">
        <Link href={href}>
          {label}
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </Button>
    </div>
  )
}

type Props = {
  dashboardData: DashboardData | null
  reportsData: ReportsData | null
}

export function DashboardClient({ dashboardData, reportsData }: Props) {
  const {
    totalTasks = 0, completedTasks = 0, inProgressTasks = 0, overdueTasks = 0,
    todayTasks = 0, pendingApproval = 0,
    projects = [], members = [], clients = [], pendingInvoices = [],
  } = dashboardData || {}

  const metricCards = [
    { title: "Total Task", value: totalTasks, icon: ListTodo, color: "text-muted-foreground" },
    { title: "Completed", value: completedTasks, icon: CheckCircle2, color: "text-green-600" },
    { title: "In Progress", value: inProgressTasks, icon: Clock, color: "text-blue-600" },
    { title: "Overdue", value: overdueTasks, icon: AlertCircle, color: "text-red-600" },
    { title: "Today Task", value: todayTasks, icon: CalendarIcon, color: "text-purple-600" },
    { title: "Pending Approval", value: pendingApproval, icon: HourglassIcon, color: "text-amber-600" },
  ]

  const upcomingDeadlines = useMemo(() => {
    return [...projects]
      .filter((p) => p.deadline && p.progress < 100)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5)
  }, [projects])

  const topProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5)
  }, [projects])

  const rTotal = reportsData?.total || 0
  const rCompleted = reportsData?.completed || 0
  const rInProgress = reportsData?.inProgress || 0
  const rOverdue = reportsData?.overdue || 0
  const rCompletionRate = rTotal > 0 ? Math.round((rCompleted / rTotal) * 100) : 0
  const priorityBreakdown = reportsData?.priorityBreakdown || []
  const statusBreakdown = reportsData?.statusBreakdown || []

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
        <TabsTrigger
          value="overview"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="reports"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          Reports
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between px-0.5">
            <h1 className="text-xl sm:text-2xl font-bold">Dashboard Overview</h1>
            <div className="flex items-center gap-2">
              <DashboardCalendarPopup />
              <Button asChild size="sm">
                <Link href="/createtask">
                  <ListTodo className="mr-1 size-4" />
                  New Task
                </Link>
              </Button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-3 sm:grid-cols-6">
            {metricCards.map((c) => (
              <Card key={c.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{c.title}</CardTitle>
                  <c.icon className={`size-3.5 sm:size-4 shrink-0 ${c.color}`} />
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold truncate">{c.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Project Insights */}
          <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 lg:grid-cols-2">
            <Card className="flex flex-col min-h-[280px] sm:min-h-[320px] lg:h-[360px]">
              <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <CalendarIcon className="size-3.5 sm:size-4 shrink-0" /> <span className="truncate">Upcoming Deadlines</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col min-h-0">
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No upcoming deadlines</p>
                ) : (
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                    {upcomingDeadlines.map((p) => {
                      const daysLeft = Math.ceil((new Date(p.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      return (
                        <div key={p.id} className="flex items-center gap-3 rounded-sm border p-3">
                          <div className="size-8 rounded-sm flex items-center justify-center text-sm font-bold shrink-0 bg-primary/10 text-primary">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.client || "—"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-medium">{p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}</p>
                            <Badge variant={daysLeft < 0 ? "destructive" : daysLeft <= 7 ? "secondary" : "outline"} className="text-[10px] mt-0.5">
                              {daysLeft < 0 ? "Overdue" : `${daysLeft}d left`}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex flex-col min-h-[280px] sm:min-h-[320px] lg:h-[360px]">
              <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <TrendingUpIcon className="size-3.5 sm:size-4 shrink-0" /> <span className="truncate">Top Progress Projects</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col min-h-0">
                {topProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No projects yet</p>
                ) : (
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
                    {topProjects.map((p) => {
                      const isOnTrack = p.progress > 50
                      return (
                        <div key={p.id} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{p.name}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <span className={`inline-flex items-center text-xs font-semibold ${isOnTrack ? "text-green-600" : "text-amber-600"}`}>
                                {isOnTrack ? <ArrowUpIcon className="size-3 mr-0.5" /> : <ArrowDownIcon className="size-3 mr-0.5" />}
                                {p.progress}%
                              </span>
                            </div>
                          </div>
                          <Progress value={p.progress} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tables */}
          <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 lg:grid-cols-6">
            <Card className="flex flex-col min-h-[280px] sm:min-h-[320px] lg:h-[360px] lg:col-span-3">
              <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <FolderKanbanIcon className="size-3.5 sm:size-4 shrink-0" /> <span className="truncate">Active Projects</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col min-h-0">
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No projects yet.</p>
                ) : (
                  <div className="responsive-table flex-1 overflow-y-auto min-h-0">
                    <div className="sm:hidden space-y-2">
                      {projects.slice(0, ROWS_PER_CARD).map((p) => (
                        <div key={p.id} className="border rounded-sm p-3 bg-card space-y-1.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">{p.client || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-sm overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{p.progress}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p.deadline ? new Date(p.deadline).toLocaleDateString() : "No deadline"}
                          </div>
                        </div>
                      ))}
                    </div>
                    <table className="table-premium hidden sm:table w-full text-sm text-left">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Client</th>
                          <th>Progress</th>
                          <th>Deadline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.slice(0, ROWS_PER_CARD).map((p) => (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{p.client || "—"}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-sm overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground w-8 text-right">{p.progress}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <ViewMoreFooter href="/projects" />
              </CardContent>
            </Card>

            <Card className="flex flex-col min-h-[280px] sm:min-h-[320px] lg:h-[360px] lg:col-span-3">
              <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Users className="size-3.5 sm:size-4 shrink-0" /> <span className="truncate">Team Members</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col min-h-0">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No members yet.</p>
                ) : (
                  <div className="responsive-table flex-1 overflow-y-auto min-h-0">
                    <div className="sm:hidden space-y-2">
                      {members.slice(0, ROWS_PER_CARD).map((m) => (
                        <div key={m.email} className="border rounded-sm p-3 bg-card flex items-center gap-3">
                          <Avatar className="size-10 shrink-0">
                            <AvatarImage src={m.avatar} alt={m.name} />
                            <AvatarFallback>{getInitials(m.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs capitalize text-muted-foreground">{m.role}</span>
                              <Badge className={statusStyles[m.status] || ""}>{m.status.replace(/_/g, " ")}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <table className="table-premium hidden sm:table w-full text-sm text-left">
                      <thead>
                        <tr><th>Name</th><th>Role</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {members.slice(0, ROWS_PER_CARD).map((m) => (
                          <tr key={m.email} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-8">
                                  <AvatarImage src={m.avatar} alt={m.name} />
                                  <AvatarFallback>{getInitials(m.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{m.name}</p>
                                  <p className="text-xs text-muted-foreground">{m.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm capitalize">{m.role}</td>
                            <td className="px-4 py-3">
                              <Badge className={statusStyles[m.status] || ""}>{m.status.replace(/_/g, " ")}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <ViewMoreFooter href="/teams" />
              </CardContent>
            </Card>

            <Card className="flex flex-col min-h-[280px] sm:min-h-[320px] lg:h-[360px] lg:col-span-3">
              <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Building2Icon className="size-3.5 sm:size-4 shrink-0" /> <span className="truncate">Recent Clients</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col min-h-0">
                {clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No clients yet.</p>
                ) : (
                  <div className="responsive-table flex-1 overflow-y-auto min-h-0">
                    <div className="sm:hidden space-y-2">
                      {clients.slice(0, ROWS_PER_CARD).map((c) => (
                        <div key={c.id} className="border rounded-sm p-3 bg-card space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{c.name}</span>
                            <Badge variant="secondary" className="text-xs">{c.status || "Lead"}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{c.company || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                      ))}
                    </div>
                    <table className="table-premium hidden sm:table w-full text-sm text-left">
                      <thead>
                        <tr><th>Name</th><th>Company</th><th>Email</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {clients.slice(0, ROWS_PER_CARD).map((c) => (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{c.company || "—"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{c.email}</td>
                            <td className="px-4 py-3"><Badge variant="secondary">{c.status || "Lead"}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <ViewMoreFooter href="/clients" />
              </CardContent>
            </Card>

            <Card className="flex flex-col min-h-[280px] sm:min-h-[320px] lg:h-[360px] lg:col-span-3">
              <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <IndianRupeeIcon className="size-3.5 sm:size-4 shrink-0" /> <span className="truncate">Pending Payments</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col min-h-0">
                {pendingInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No pending payments.</p>
                ) : (
                  <div className="responsive-table flex-1 overflow-y-auto min-h-0">
                    <div className="sm:hidden space-y-2">
                      {pendingInvoices.slice(0, ROWS_PER_CARD).map((inv) => (
                        <div key={inv.id} className="border rounded-sm p-3 bg-card space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Invoice #{inv.number || inv.id.slice(0, 8)}</span>
                            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">Pending</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{inv.customerName || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                          </p>
                          <p className="text-sm font-semibold text-amber-600">
                            ₹{(inv.amountPaid / 100).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <table className="table-premium hidden sm:table w-full text-sm text-left">
                      <thead>
                        <tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {pendingInvoices.slice(0, ROWS_PER_CARD).map((inv) => (
                          <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-4 py-3 text-sm font-medium">#{inv.number || inv.id.slice(0, 8)}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{inv.customerName || "—"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-amber-600">
                              ₹{(inv.amountPaid / 100).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700">Pending</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <ViewMoreFooter href="/billing" />
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="reports" className="mt-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BarChart3Icon className="size-6 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3Icon className="size-4" /> Total Tasks</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{rTotal}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="size-4" /> Completed</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-500">{rCompleted}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-400">{rInProgress}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUpIcon className="size-4" /> Completion Rate</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{rCompletionRate}%</div></CardContent>
            </Card>
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
      </TabsContent>
    </Tabs>
  )
}
