"use client"

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProjectsInteractive from "./projects-interactive.client"
import Clients from "@/app/clients/clients.client"
import ContractorsPage from "@/app/contractors/contractors-page"
import type { Project } from "@/components/projects/project-types"
import type { Client } from "@/app/clients/columns"

type Props = {
  orgId?: string
  initialProjects?: Project[]
  initialClientList?: string[]
  initialClients?: Client[]
  user?: { name: string; email: string; avatar: string }
}

export default function ProjectsClient({
  orgId: initialOrgId,
  initialProjects = [],
  initialClientList = [],
  initialClients = [],
  user: initialUser,
}: Props) {
  const [activeTab, setActiveTab] = useState("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [orgId, setOrgId] = useState(initialOrgId || "");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [clientList, setClientList] = useState<string[]>(initialClientList);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [user, setUser] = useState(initialUser || { name: "", email: "", avatar: "" });
  const [loading, setLoading] = useState(!initialOrgId);

  useEffect(() => {
    if (initialOrgId) return;
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setOrgId(data.orgId || "");
        setProjects(data.projects || []);
        setClientList(data.clientList || []);
        setClients(data.clients || []);
        setUser(data.user || { name: "", email: "", avatar: "" });
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
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery(""); }} className="w-full">
        <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
          <TabsTrigger value="projects" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">All Projects</TabsTrigger>
          <TabsTrigger value="clients" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Clients</TabsTrigger>
          <TabsTrigger value="contractors" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Contractors</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex-1 overflow-auto">
        {activeTab === "projects" && (
          <ProjectsInteractive orgId={orgId} initialProjects={projects} initialClientList={clientList} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        )}
        {activeTab === "clients" && (
          <Clients initialClients={clients} user={user} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        )}
        {activeTab === "contractors" && (
          <ContractorsPage searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        )}
      </div>
    </div>
  )
}
