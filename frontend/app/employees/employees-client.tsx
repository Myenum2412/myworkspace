"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EmployeesInteractive from "./employees-interactive"
import TeamsClient from "../teams/teams-client"
import TerminatedInteractive from "../terminated/terminated-interactive"
import { AttendanceTable } from "@/components/attendance/attendance-table"
import { EmployeeReport } from "@/components/attendance/employee-report"

type EmployeesClientProps = {
  employees: any[]
  user: any
  teams: any[]
  members: any[]
  orgId?: string
  terminated: any[]
  attendanceData: any[]
  reportEmployees: Record<string, unknown>[]
}

export default function EmployeesClient({
  employees,
  user,
  teams,
  members,
  orgId,
  terminated,
  attendanceData,
  reportEmployees,
}: EmployeesClientProps) {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
        <TabsTrigger
          value="all"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          All Employees
        </TabsTrigger>
        <TabsTrigger
          value="teams"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          Teams
        </TabsTrigger>
        <TabsTrigger
          value="terminated"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          Terminated
        </TabsTrigger>
        <TabsTrigger
          value="attendance"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          Attendance Overview
        </TabsTrigger>
        <TabsTrigger
          value="report"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          Employee Report
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-4">
        <EmployeesInteractive employees={employees} user={user} />
      </TabsContent>

      <TabsContent value="teams" className="mt-4">
        <TeamsClient teams={teams} members={members} orgId={orgId} />
      </TabsContent>

      <TabsContent value="terminated" className="mt-4">
        <TerminatedInteractive terminated={terminated} />
      </TabsContent>

      <TabsContent value="attendance" className="mt-4">
        <AttendanceTable data={attendanceData} />
      </TabsContent>

      <TabsContent value="report" className="mt-4">
        <EmployeeReport employees={reportEmployees} />
      </TabsContent>
    </Tabs>
  )
}
