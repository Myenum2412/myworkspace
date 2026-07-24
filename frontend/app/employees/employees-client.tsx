"use client"

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EmployeesInteractive from "./employees-interactive"
import TeamsClient from "@/app/teams/teams-client.client"
import type { Employee } from "./columns"
import type { Team } from "@/app/teams/columns"
import type { OrgMember } from "@/components/teams/team-types"

type EmployeesClientProps = {
  employees?: Employee[];
  user?: any;
  teams?: Team[];
  teamMembers?: OrgMember[];
  orgId?: string;
}

export default function EmployeesClient({
  employees: initialEmployees = [],
  user: initialUser,
  teams: initialTeams = [],
  teamMembers: initialTeamMembers = [],
  orgId: initialOrgId = "",
}: EmployeesClientProps) {
  const [activeTab, setActiveTab] = useState("employees");
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [user, setUser] = useState(initialUser);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [teamMembers, setTeamMembers] = useState<OrgMember[]>(initialTeamMembers);
  const [orgId, setOrgId] = useState(initialOrgId);
  const [loading, setLoading] = useState(!initialOrgId);

  useEffect(() => {
    if (initialOrgId) return;
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        setEmployees(data.employees || []);
        setUser(data.user);
        setTeams(data.teams || []);
        setTeamMembers(data.teamMembers || []);
        setOrgId(data.orgId || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialOrgId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
        <TabsTrigger value="employees" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Employees</TabsTrigger>
        <TabsTrigger value="teams" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Teams</TabsTrigger>
      </TabsList>
      <TabsContent value="employees" className="mt-4">
        <EmployeesInteractive employees={employees} user={user} />
      </TabsContent>
      <TabsContent value="teams" className="mt-0">
        <TeamsClient teams={teams} members={teamMembers} orgId={orgId} />
      </TabsContent>
    </Tabs>
  )
}
