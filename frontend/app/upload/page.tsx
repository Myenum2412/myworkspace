import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import UploadInteractive from "./upload-interactive";

export const dynamic = "force-dynamic";

type Project = {
  id: string;
  name: string;
};

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let projects: Project[] = [];
  if (orgId) {
    const raw = await db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).toArray();
    projects = (raw as unknown as Record<string, unknown>[]).map((p) => ({
      id: (p.id as string) || "",
      name: (p.name as string) || "",
    }));
  }

  return <UploadInteractive projects={projects} user={session.user} />;
}
