import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import AddProjectsInteractive from "./addprojects-interactive";

export const dynamic = "force-dynamic";

export default async function AddProjectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let clientList: string[] = [];
  if (orgId) {
    const projects = await db.collection(collections.projects).find({ orgId }).toArray();
    clientList = [...new Set(
      (projects as unknown as Record<string, unknown>[]).map((p) => p.client as string).filter(Boolean)
    )] as string[];
  }

  return <AddProjectsInteractive clientList={clientList} />;
}
