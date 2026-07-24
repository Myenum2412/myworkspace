"use client"

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EmployeesInteractive from "./employees-interactive"
import TeamsClient from "@/app/teams/teams-client.client"
import type { Employee } from "./columns"
import type { Team } from "@/app/teams/columns"
import type { OrgMember } from "@/components/teams/team-types"

type EmployeesClientProps = {
  employees: Employee[];
  user: any;
  teams: Team[];
  teamMembers: OrgMember[];
  orgId: string;
}

export default function EmployeesClient({
  employees,
  user,
  teams,
  teamMembers,
  orgId,
}: EmployeesClientProps) {
  const [activeTab, setActiveTab] = useState("employees");

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
