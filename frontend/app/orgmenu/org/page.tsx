import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { OrgsTable } from "@/components/orgs-table";
import { OrgLimitsEditor } from "./limits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organization" };

const getOrg = cache(async (orgId: string) => {
  try {
    return await db.collection(collections.organizations).findOne({ id: orgId });
  } catch {
    return null;
  }
});

const getAllOrgs = cache(async () => {
  try {
    const cursor = await db.collection(collections.organizations).find({});
    return await cursor.sort({ createdAt: -1 }).toArray();
  } catch {
    return [];
  }
});

export default async function OrgDetailsPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const org = orgId ? await getOrg(orgId) : null;
  const allOrgs = isSuperAdmin ? await getAllOrgs() : [];

  const orgs = isSuperAdmin
    ? allOrgs.map((o) => ({
        id: o.id as string,
        name: o.name as string,
        plan: (o.plan as string) || "starter",
        domain: (o.domain as string) || "",
        slug: (o.slug as string) || "",
        createdAt: o.createdAt ? new Date(o.createdAt as string).toLocaleDateString() : "—",
      }))
    : org
      ? [{
          id: org.id as string,
          name: org.name as string,
          plan: (org.plan as string) || "starter",
          domain: (org.domain as string) || "",
          slug: (org.slug as string) || "",
          createdAt: org.createdAt ? new Date(org.createdAt as string).toLocaleDateString() : "—",
        }]
      : [];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orgs.length} organization{orgs.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <OrgsTable orgs={orgs} />

      <OrgLimitsEditor />
    </div>
  );
}
