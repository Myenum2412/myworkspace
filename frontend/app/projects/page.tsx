import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import ProjectsClient from "./projects-client";
import type { Project } from "@/components/projects/project-types";
import type { Client } from "@/app/clients/columns";

export const dynamic = "force-dynamic";

interface ClientUserDoc {
  clientId?: string;
  username?: string;
}

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);

  let initialProjects: Project[] = [];
  let initialClientList: string[] = [];
  let initialClients: Client[] = [];

  if (orgId) {
    const projectsRaw = (await db.collection(collections.projects)
      .find({ orgId })
      .sort({ createdAt: -1 })
      .toArray()) as unknown as Record<string, unknown>[];

    initialProjects = projectsRaw.map((p) => ({
      id: (p.id as string) || String(p._id || ""),
      name: (p.name as string) || "",
      client: (p.client as string) || "",
      color: (p.color as string) || "#93c5fd",
      description: (p.description as string) || "",
      deadline: (p.dueDate as string) || (p.deadline as string) || null,
      tracked: Number(p.tracked ?? 0),
      progress: Number(p.progress ?? 0),
      access: (p.access as "Public" | "Private") || "Public",
      status: (p.status as "Active" | "Inactive") || "Active",
      members: Array.isArray(p.members) ? (p.members as string[]) : undefined,
      headId: (p.headId as string) || undefined,
      headName: (p.headName as string) || undefined,
      headAvatar: (p.headAvatar as string) || undefined,
      priority: (p.priority as Project["priority"]) || "medium",
      category: (p.category as string) || "",
      budget: Number(p.budget ?? 0),
      spent: Number(p.spent ?? 0),
      startDate: (p.startDate as string) || null,
    }));

    const clientsRaw = (await db.collection(collections.clients)
      .find({ orgId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()) as unknown as Record<string, unknown>[];

    const clientNames = clientsRaw.map((c) => c.name as string).filter(Boolean);
    initialClientList = clientNames.length > 0 ? clientNames : [];

    const clientUsers = (await db
      .collection(collections.clientUsers)
      .find({ orgId })
      .toArray()) as ClientUserDoc[];

    const userMap = new Map<string, string>();
    for (const u of clientUsers) {
      if (u.clientId && u.username) userMap.set(u.clientId, u.username);
    }

    initialClients = clientsRaw.map((c) => {
      const id = (c.id ?? (c._id instanceof ObjectId ? c._id.toString() : String(c._id ?? ""))) as string;
      return {
        ...(c as unknown as Client),
        id,
        name: (c.name as string) || "",
        email: (c.email as string) || "",
        username: userMap.get(id) || (c.username as string) || "",
        company: (c.company as string) || "",
        projects: Number(c.projects ?? 0),
        status: (c.status as string) || "",
      };
    });
  }

  return (
    <ProjectsClient
      orgId={orgId || ""}
      initialProjects={initialProjects}
      initialClientList={initialClientList}
      initialClients={initialClients}
      user={{ name: session.user.name || "User", email: session.user.email || "", avatar: session.user.image || "" }}
    />
  );
}
