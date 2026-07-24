"use client"

import EmployeesInteractive from "./employees-interactive"

type EmployeesClientProps = {
  employees: any[]
  user: any
}

export default function EmployeesClient({
  employees,
  user,
}: EmployeesClientProps) {
  return <EmployeesInteractive employees={employees} user={user} />
}
