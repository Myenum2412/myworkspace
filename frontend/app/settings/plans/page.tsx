import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { SettingsPlansPageInteractive } from "./plans-interactive";

export const dynamic = "force-dynamic";

export default async function SettingsPlansPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let orgPlan = "free";
  let usedMB = 0;

  if (orgId) {
    // Fetch org plan
    let orgObjId: ObjectId | undefined;
    try { orgObjId = new ObjectId(orgId); } catch { /* not an ObjectId */ }
    const org = (await db.collection(collections.organizations).findOne(
      orgObjId ? { $or: [{ id: orgId }, { _id: orgObjId }] } : { id: orgId }
    )) as Record<string, unknown> | null;
    if (org?.plan) {
      orgPlan = String(org.plan);
      // Normalize legacy plan values
      if (orgPlan === "starter") orgPlan = "free";
      else if (orgPlan === "pro") orgPlan = "growth";
    }

    // Fetch used storage (sum of file sizes). The backend /api/files/stats
    // returns totalSize as the raw sum of the size field, which the client
    // stores in `usedMB` and passes to formatBytes as-is.
    const sizeAgg = (await db.collection(collections.fileAttachments).aggregate([
      { $match: { orgId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$size" } } },
    ]).toArray()) as Array<{ _id: null; total: number }>;
    usedMB = sizeAgg[0]?.total || 0;
  }

  return <SettingsPlansPageInteractive orgPlan={orgPlan} orgId={orgId || ""} usedMB={usedMB} />;
}
