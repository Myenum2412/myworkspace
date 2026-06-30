import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import Clients from "./clients";
import type { Client } from "./columns";

export const dynamic = "force-dynamic";

interface ClientUserDoc {
  clientId?: string;
  username?: string;
}

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) redirect("/login");

  const rawClients = (await db
    .collection(collections.clients)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .toArray()) as Record<string, unknown>[];

  const clientUsers = (await db
    .collection(collections.clientUsers)
    .find({ orgId })
    .toArray()) as ClientUserDoc[];

  const userMap = new Map<string, string>();
  for (const u of clientUsers) {
    if (u.clientId && u.username) userMap.set(u.clientId, u.username);
  }

  const clients: Client[] = rawClients.map((c) => {
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

  return <Clients initialClients={clients} user={session.user} />;
}
