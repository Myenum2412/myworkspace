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

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  projects: number;
  status: string;
}

const defaultClients: Client[] = [
  { id: "1", name: "John Smith", email: "john@acmecorp.com", company: "Acme Corp", projects: 3, status: "Active" },
  { id: "2", name: "Jane Doe", email: "jane@globex.com", company: "Globex Inc", projects: 1, status: "Active" },
  { id: "3", name: "Bill Lumbergh", email: "bill@initech.com", company: "Initech", projects: 2, status: "Active" },
  { id: "4", name: "Tony Stark", email: "tony@starkindustries.com", company: "Stark Industries", projects: 1, status: "Inactive" },
  { id: "5", name: "Peter Wyenandt", email: "peter@umbrellacorp.com", company: "Umbrella Corp", projects: 1, status: "Active" },
];

export default function ClientsPage() {
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
          <h1 className="text-2xl font-bold">Clients</h1>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{defaultClients.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {defaultClients.filter((c) => c.status === "Active").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {defaultClients.reduce((acc, c) => acc + c.projects, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Client Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Name</th>
                      <th className="pb-3 pr-4 font-medium">Email</th>
                      <th className="pb-3 pr-4 font-medium">Company</th>
                      <th className="pb-3 pr-4 font-medium">Projects</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaultClients.map((client) => (
                      <tr key={client.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{client.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{client.email}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{client.company}</td>
                        <td className="py-3 pr-4">{client.projects}</td>
                        <td className="py-3">
                          <Badge variant={client.status === "Active" ? "default" : "secondary"}>
                            {client.status}
                          </Badge>
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
