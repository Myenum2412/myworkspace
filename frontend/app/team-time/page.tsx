"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Users, Clock, CalendarDays, Activity, Loader2, Calendar } from "lucide-react";

interface TeamMemberSummary {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  status: string;
  department: string;
  designation: string;
  role: string;
  totalMinutes: number;
  totalHours: string;
  entryCount: number;
  pendingEntries: number;
  approvedEntries: number;
}

interface TeamSummaryData {
  members: TeamMemberSummary[];
  summary: {
    totalMembers: number;
    activeMembers: number;
    totalHoursAll: string;
    totalEntries: number;
  };
}

export default function TeamTimePage() {
  const { data: session } = useSession();
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [data, setData] = useState<TeamSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [teamFilter, setTeamFilter] = useState("all");

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    setLoading(true);

    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const orgId = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (!orgId) {
          setLoading(false);
          return;
        }

        const params = new URLSearchParams({ orgId });
        if (date) params.set("date", date.toISOString().slice(0, 10));

        return fetch(`/api/time-entries/team-summary?${params}`, { credentials: "include" })
          .then((r) => r.json())
          .then((res) => {
            const d = res.data || res;
            setData(Array.isArray(d) ? { members: d, summary: { totalMembers: d.length, activeMembers: d.filter((m: TeamMemberSummary) => m.entryCount > 0).length, totalHoursAll: d.reduce((s: number, m: TeamMemberSummary) => s + m.totalMinutes, 0) / 60 + "", totalEntries: d.reduce((s: number, m: TeamMemberSummary) => s + m.entryCount, 0) } } : d);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, [session, date]);

  const members = data?.members || [];
  const summary = data?.summary || { totalMembers: 0, activeMembers: 0, totalHoursAll: "0", totalEntries: 0 };
  const filteredMembers = teamFilter === "all" ? members : members.filter((m) => m.entryCount > 0);

  const statCards = [
    { title: "Total Members", value: summary.totalMembers, icon: Users, color: "text-blue-600" },
    { title: "Active Today", value: summary.activeMembers, icon: Activity, color: "text-emerald-600" },
    { title: "Total Hours", value: summary.totalHoursAll, icon: Clock, color: "text-purple-600" },
    { title: "Total Entries", value: summary.totalEntries, icon: CalendarDays, color: "text-orange-600" },
  ];

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      online: "bg-emerald-500",
      offline: "bg-gray-400",
      break: "bg-amber-500",
    };
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-gray-400"}`} />;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Team Time</h1>
              <p className="text-sm text-muted-foreground mt-1">Track time across your team</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors">
                  <Calendar className="size-4" />
                  {date ? date.toDateString() === new Date().toDateString() ? "Today" : date.toLocaleDateString() : "Select date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarUI
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {statCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <card.icon className={`size-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Members</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={teamFilter === "all" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setTeamFilter("all")}
                  >
                    All ({summary.totalMembers})
                  </Badge>
                  <Badge
                    variant={teamFilter === "active" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setTeamFilter("active")}
                  >
                    Active ({summary.activeMembers})
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="size-10 mb-3 opacity-50" />
                  <p>No time entries found for this date</p>
                  <p className="text-sm">Select a different date to view team activity</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Member</th>
                        <th className="pb-3 font-medium">Department</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Entries</th>
                        <th className="pb-3 font-medium text-right">Hours</th>
                        <th className="pb-3 font-medium text-right">Approved</th>
                        <th className="pb-3 font-medium text-right">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => (
                        <tr key={member.userId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="size-8">
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm">{member.department || "—"}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              {getStatusDot(member.status)}
                              <span className="text-sm capitalize">{member.status}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className="text-sm font-medium">{member.entryCount}</span>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className="text-sm font-medium">{member.totalHours}h</span>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <Badge variant="secondary" className="font-mono text-xs">{member.approvedEntries}</Badge>
                          </td>
                          <td className="py-3 text-right">
                            <Badge variant="outline" className="font-mono text-xs">{member.pendingEntries}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
