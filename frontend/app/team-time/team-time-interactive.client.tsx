"use client";

import { useState } from "react";
import { RingStat } from "@/components/ring-stat";
import Stats07, { type Stats07Item } from "@/components/stats-07";
import { TeamMemberViewDialog } from "@/components/time-tracker/team-member-view-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Clock, EyeIcon, Loader2 } from "@/lib/icons";

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

interface TeamTimeProps {
  initialData: TeamSummaryData | null;
}

export default function TeamTime({ initialData }: TeamTimeProps) {
  const [data, setData] = useState<TeamSummaryData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [teamFilter, setTeamFilter] = useState("all");
  const [viewMember, setViewMember] = useState<TeamMemberSummary | null>(null);

  const members = data?.members || [];
  const summary = data?.summary || {
    totalMembers: 0,
    activeMembers: 0,
    totalHoursAll: "0",
    totalEntries: 0,
  };
  const filteredMembers = teamFilter === "all" ? members : members.filter((m) => m.entryCount > 0);

  const statItems: Stats07Item[] = [
    { name: "Total Members", value: summary.totalMembers, subtitle: "Total members" },
    {
      name: "Active Today",
      value: summary.activeMembers,
      subtitle: "Active today",
      fill: "#3b82f6",
    },
    {
      name: "Total Hours",
      value: parseFloat(summary.totalHoursAll) || 0,
      subtitle: "Total hours",
      fill: "#f59e0b",
    },
    { name: "Total Entries", value: summary.totalEntries, subtitle: "Total entries" },
  ];

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      online: "bg-green-500",
      offline: "bg-gray-1000",
      break: "bg-gray-400",
    };
    return (
      <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-gray-400"}`} />
    );
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
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Time</h1>
          <p className="text-sm text-muted-foreground mt-1">Track time across your team</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 text-sm border rounded-sm hover:bg-muted transition-colors">
              <Calendar className="size-4" />
              {date
                ? date.toDateString() === new Date().toDateString()
                  ? "Today"
                  : date.toLocaleDateString()
                : "Select date"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarUI mode="single" selected={date} onSelect={setDate} />
          </PopoverContent>
        </Popover>
      </div>

      <Stats07 items={statItems} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Team Members</CardTitle>
            <RingStat
              value={summary.activeMembers}
              max={summary.totalMembers}
              label="active"
              fill="var(--chart-2)"
            />
          </div>
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-destructive">
              <p className="text-sm">{error}</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="size-10 mb-3 opacity-50" />
              <p>No time entries found for this date</p>
              <p className="text-sm">Select a different date to view team activity</p>
            </div>
          ) : (
            <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="table-premium w-full text-sm text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">
                      Member
                    </th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">
                      Department
                    </th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">
                      Status
                    </th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-right">
                      Entries
                    </th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-right">
                      Hours
                    </th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-right">
                      Approved
                    </th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-right">
                      Pending
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.userId}
                      className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
                      onClick={() => setViewMember(member)}
                    >
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <span className="text-sm">{member.department || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusDot(member.status)}
                          <span className="text-sm capitalize">{member.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium">{member.entryCount}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium">{member.totalHours}h</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {member.approvedEntries}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="outline" className="font-mono text-xs">
                          {member.pendingEntries}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <TeamMemberViewDialog
        member={viewMember}
        open={!!viewMember}
        onOpenChange={(open) => {
          if (!open) setViewMember(null);
        }}
      />
    </main>
  );
}
