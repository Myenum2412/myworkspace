"use client"

import { useEffect, useMemo, useState } from "react"

type DashboardData = {
  totalTasks: number; completedTasks: number; inProgressTasks: number;
  overdueTasks: number; todayTasks: number; pendingApproval: number;
  projects: { id: string; name: string; client: string; status: string; progress: number; deadline: string | null; }[];
  members: { name: string; email: string; role: string; status: string; avatar: string; }[];
  clients: { id: string; name: string; company: string; email: string; status: string; }[];
  pendingInvoices: { id: string; number: string; amountPaid: number; currency: string; status: string; createdAt: string; customerName: string; }[];
};
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import {
  ListTodo, Clock, CalendarIcon, TrendingUpIcon,
  Users, FolderKanbanIcon, Building2Icon,
  IndianRupeeIcon, ArrowRightIcon, SearchIcon, LayoutDashboardIcon,
} from "@/lib/icons"
import Link from "next/link"
import DashboardCalendarPopup from "@/components/dashboard-calendar-popup"
import Stats07 from "@/components/stats-07"
import { RingStat } from "@/components/ring-stat"
import { useIndustry } from "@/components/industry-provider"

const ROWS_PER_CARD = 5

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

const statusStyles: Record<string, string> = {
  active: "bg-green-100/70 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  online: "bg-green-100/70 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
  offline: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
  on_leave: "bg-amber-100/70 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
}

function ViewMoreFooter({ href, label = "View More" }: { href: string; label?: string }) {
  return (
    <div className="flex justify-end pt-3 mt-3 border-t border-border shrink-0">
      <Button asChild variant="outline" size="sm" className="text-xs">
        <Link href={href}>
          {label}
          <ArrowRightIcon className="" />
        </Link>
      </Button>
    </div>
  )
}

function CardTitleWithIcon({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <CardTitle className="text-sm sm:text-[15px] flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </CardTitle>
  )
}

type Props = {
  dashboardData?: DashboardData | null
}

export function DashboardOverviewClient({ dashboardData: initialData }: Props) {
  const { t } = useIndustry();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) return;
    fetch("/api/dashboard/data")
      .then((r) => r.json())
      .then((data) => setDashboardData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialData]);

  const {
    totalTasks = 0, completedTasks = 0, inProgressTasks = 0, overdueTasks = 0,
    todayTasks = 0, pendingApproval = 0,
    projects = [], members = [], clients = [], pendingInvoices = [],
  } = dashboardData || {}

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

  const ringStats = useMemo(() => {
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const dueSoon = projects.filter((p) => p.deadline && new Date(p.deadline).getTime() - now < weekMs).length
    const nearDone = projects.filter((p) => p.progress >= 75).length
    const activeProjects = projects.filter((p) => p.status === "Active").length
    const onlineMembers = members.filter((m) => ["online", "active"].includes((m.status || "").toLowerCase())).length
    const activeClients = clients.filter((c) => (c.status || "").toLowerCase() !== "lead").length
    const recentInvoices = pendingInvoices.filter((inv) => inv.createdAt && now - new Date(inv.createdAt).getTime() < weekMs).length
    return { dueSoon, nearDone, activeProjects, onlineMembers, activeClients, recentInvoices }
  }, [projects, members, clients, pendingInvoices])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={<LayoutDashboardIcon className="size-6" />}
        title={
          <h1 data-tour-step-id="step-dashboard">{t("page.dashboard.title")}</h1>
        }
        subtitle={<p>Welcome back — here&apos;s what&apos;s happening across your workspace.</p>}
        search={
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("page.dashboard.searchPlaceholder")}
              className="pl-9 h-9 bg-card rounded-lg w-full"
              data-tour-step-id="step-search"
            />
          </div>
        }
        actions={
          <>
            <div className="inline-flex" data-tour-step-id="step-calendar"><DashboardCalendarPopup /></div>
            <Button asChild size="sm" className="h-9 rounded-lg" data-tour-step-id="step-new-task">
              <Link href="/createtask">
                <ListTodo className="mr-1.5" />
                {t("page.dashboard.newTask")}
              </Link>
            </Button>
          </>
        }
      />

      <div data-tour-step-id="step-stats">
        <Stats07
          items={[
            { name: t("page.dashboard.totalTasks"), value: totalTasks, subtitle: `${completedTasks} ${t("common.active").toLowerCase()}` },
          { name: t("page.dashboard.inProgress"), value: inProgressTasks, subtitle: t("common.active") },
              { name: t("page.dashboard.overdue"), value: overdueTasks, subtitle: 'Past due date', fill: '#ef4444' },
          { name: t("page.dashboard.today"), value: todayTasks, subtitle: 'Created today' },
          { name: t("page.dashboard.pendingApproval"), value: pendingApproval, subtitle: 'Awaiting review' },
          { name: t("page.dashboard.projects"), value: projects.length, subtitle: `${t("common.active")} ${t("page.dashboard.projects").toLowerCase()}` },
        ]}
        />
      </div>

      <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-1 lg:grid-cols-2">
        <Card className="flex flex-col min-h-[280px] sm:min-h-[320px] lg:h-[360px]">
          <CardHeader className="px-4 pt-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <CardTitleWithIcon icon={<CalendarIcon className="size-3.5 sm:size-4" />}>
                {t("page.dashboard.upcomingDeadlines")}
              </CardTitleWithIcon>
              <RingStat value={ringStats.dueSoon} max={projects.length} label="due in 7 days" fill="#ef4444" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col min-h-0">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No upcoming deadlines</p>
            ) : (
              <div className="responsive-table flex-1 overflow-y-auto min-h-0">
                <div className="sm:hidden space-y-2">
                  {upcomingDeadlines.map((p) => (
                    <div key={p.id} className="border rounded-xl p-3 bg-card space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.progress}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <table className="table-premium hidden sm:table w-full text-sm text-left">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingDeadlines.map((p) => (
                      <tr key={p.id}>
                        <td className="text-sm font-medium">{p.name}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{p.progress}%</span>
                          </div>
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

        <Card className="flex flex-col min-h-[280px] sm:min-h-[320px] lg:h-[360px]">
          <CardHeader className="px-4 pt-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <CardTitleWithIcon icon={<TrendingUpIcon className="size-3.5 sm:size-4" />}>
                {t("page.dashboard.topProgressProjects")}
              </CardTitleWithIcon>
              <RingStat value={ringStats.nearDone} max={projects.length} label="75% complete" fill="#22c55e" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col min-h-0">
            {topProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No projects yet</p>
            ) : (
              <div className="responsive-table flex-1 overflow-y-auto min-h-0">
                <div className="sm:hidden space-y-2">
                  {topProjects.map((p) => (
                    <div key={p.id} className="border rounded-xl p-3 bg-card space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.progress}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <table className="table-premium hidden sm:table w-full text-sm text-left">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProjects.map((p) => (
                      <tr key={p.id}>
                        <td className="text-sm font-medium">{p.name}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{p.progress}%</span>
                          </div>
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
      </div>

      <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-1 lg:grid-cols-6">
        <Card className="flex flex-col min-h-[280px] sm:min-h-[320px] lg:h-[360px] lg:col-span-3">
          <CardHeader className="px-4 pt-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <CardTitleWithIcon icon={<FolderKanbanIcon className="size-3.5 sm:size-4" />}>
                {t("page.dashboard.activeProjects")}
              </CardTitleWithIcon>
              <RingStat value={ringStats.activeProjects} max={projects.length} label="active" fill="var(--chart-2)" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col min-h-0">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No projects yet.</p>
            ) : (
              <div className="responsive-table flex-1 overflow-y-auto min-h-0">
                <div className="sm:hidden space-y-2">
                  {projects.slice(0, ROWS_PER_CARD).map((p) => (
                    <div key={p.id} className="border rounded-xl p-3 bg-card space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.client || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
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
                      <tr key={p.id}>
                        <td className="text-sm font-medium">{p.name}</td>
                        <td className="text-sm text-muted-foreground">{p.client || "—"}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{p.progress}%</span>
                          </div>
                        </td>
                        <td className="text-sm text-muted-foreground">
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
          <CardHeader className="px-4 pt-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <CardTitleWithIcon icon={<Users className="size-3.5 sm:size-4" />}>
                {t("page.dashboard.teamMembers")}
              </CardTitleWithIcon>
              <RingStat value={ringStats.onlineMembers} max={members.length} label="online" fill="var(--chart-3)" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col min-h-0">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No members yet.</p>
            ) : (
              <div className="responsive-table flex-1 overflow-y-auto min-h-0">
                <div className="sm:hidden space-y-2">
                  {members.slice(0, ROWS_PER_CARD).map((m) => (
                    <div key={m.email} className="border rounded-xl p-3 bg-card flex items-center gap-3">
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
                      <tr key={m.email}>
                        <td>
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
                        <td className="text-sm capitalize">{m.role}</td>
                        <td>
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
          <CardHeader className="px-4 pt-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <CardTitleWithIcon icon={<Building2Icon className="size-3.5 sm:size-4" />}>
                {t("page.dashboard.recentClients")}
              </CardTitleWithIcon>
              <RingStat value={ringStats.activeClients} max={clients.length} label="active" fill="var(--chart-4)" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col min-h-0">
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No clients yet.</p>
            ) : (
              <div className="responsive-table flex-1 overflow-y-auto min-h-0">
                <div className="sm:hidden space-y-2">
                  {clients.slice(0, ROWS_PER_CARD).map((c) => (
                    <div key={c.id} className="border rounded-xl p-3 bg-card space-y-1">
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
                      <tr key={c.id}>
                        <td className="text-sm font-medium">{c.name}</td>
                        <td className="text-sm text-muted-foreground">{c.company || "—"}</td>
                        <td className="text-sm text-muted-foreground">{c.email}</td>
                        <td><Badge variant="secondary">{c.status || "Lead"}</Badge></td>
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
          <CardHeader className="px-4 pt-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <CardTitleWithIcon icon={<IndianRupeeIcon className="size-3.5 sm:size-4" />}>
                {t("page.dashboard.pendingPayments")}
              </CardTitleWithIcon>
              <RingStat value={ringStats.recentInvoices} max={pendingInvoices.length} label="in 7 days" fill="#f59e0b" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col min-h-0">
            {pendingInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No pending payments.</p>
            ) : (
              <div className="responsive-table flex-1 overflow-y-auto min-h-0">
                <div className="sm:hidden space-y-2">
                  {pendingInvoices.slice(0, ROWS_PER_CARD).map((inv) => (
                    <div key={inv.id} className="border rounded-xl p-3 bg-card space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Invoice #{inv.number || inv.id.slice(0, 8)}</span>
                        <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">Pending</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{inv.customerName || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                      </p>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
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
                      <tr key={inv.id}>
                        <td className="text-sm font-medium">#{inv.number || inv.id.slice(0, 8)}</td>
                        <td className="text-sm text-muted-foreground">{inv.customerName || "—"}</td>
                        <td className="text-sm text-muted-foreground">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                          ₹{(inv.amountPaid / 100).toFixed(2)}
                        </td>
                        <td>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">Pending</Badge>
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
  )
}
