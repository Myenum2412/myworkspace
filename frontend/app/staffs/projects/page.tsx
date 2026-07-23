import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import ProjectsInteractive from "@/app/projects/projects-interactive.client";
import type { Project } from "@/components/projects/project-types";

export const dynamic = "force-dynamic";

export default async function StaffProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);

  let initialProjects: Project[] = [];
  let initialClientList: string[] = [];

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

    initialClientList = clientsRaw.map((c) => c.name as string).filter(Boolean);
  }

  return (
    <ProjectsInteractive
      orgId={orgId || ""}
      initialProjects={initialProjects}
      initialClientList={initialClientList}
    />
  );
}
