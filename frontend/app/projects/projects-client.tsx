"use client"

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProjectsInteractive from "./projects-interactive.client"
import Clients from "@/app/clients/clients.client"
import ContractorsPage from "@/app/contractors/contractors-page"
import type { Project } from "@/components/projects/project-types"
import type { Client } from "@/app/clients/columns"

type Props = {
  orgId: string
  initialProjects: Project[]
  initialClientList: string[]
  initialClients: Client[]
  user: { name: string; email: string; avatar: string }
}

export default function ProjectsClient({ orgId, initialProjects, initialClientList, initialClients, user }: Props) {
  const [activeTab, setActiveTab] = useState("projects");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
        <TabsTrigger value="projects" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">All Projects</TabsTrigger>
        <TabsTrigger value="clients" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Clients</TabsTrigger>
        <TabsTrigger value="contractors" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Contractors</TabsTrigger>
      </TabsList>
      <TabsContent value="projects" className="mt-4">
        <ProjectsInteractive orgId={orgId} initialProjects={initialProjects} initialClientList={initialClientList} />
      </TabsContent>
      <TabsContent value="clients" className="mt-4">
        <Clients initialClients={initialClients} user={user} />
      </TabsContent>
      <TabsContent value="contractors" className="mt-0">
        <ContractorsPage />
      </TabsContent>
    </Tabs>
  )
}
