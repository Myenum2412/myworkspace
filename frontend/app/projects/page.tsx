"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  deadline: string;
  progress: number;
}

const defaultProjects: Project[] = [
  { id: "1", name: "Website Redesign", client: "Acme Corp", status: "In Progress", deadline: "2026-07-15", progress: 65 },
  { id: "2", name: "Mobile App v2", client: "Globex Inc", status: "Completed", deadline: "2026-05-30", progress: 100 },
  { id: "3", name: "Dashboard Overhaul", client: "Initech", status: "In Progress", deadline: "2026-08-01", progress: 30 },
  { id: "4", name: "API Integration", client: "Umbrella Corp", status: "Planning", deadline: "2026-09-10", progress: 10 },
  { id: "5", name: "Brand Refresh", client: "Stark Industries", status: "In Progress", deadline: "2026-07-01", progress: 50 },
];

export default function ProjectsPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">All Projects</h1>
            <Button>
              <PlusIcon className="mr-2 size-4" />
              New Project
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{defaultProjects.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {defaultProjects.filter((p) => p.status === "In Progress").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {defaultProjects.filter((p) => p.status === "Completed").length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Name</th>
                      <th className="pb-3 pr-4 font-medium">Client</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Deadline</th>
                      <th className="pb-3 font-medium">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaultProjects.map((project) => (
                      <tr key={project.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{project.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{project.client}</td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              project.status === "Completed" ? "default" :
                              project.status === "In Progress" ? "secondary" :
                              "outline"
                            }
                          >
                            {project.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{project.deadline}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{project.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
