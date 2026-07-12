import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import EngagementPage from "./engagement.client";
import type { Engagement } from "./columns";

export const dynamic = "force-dynamic";

export default async function EngagementServerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) redirect("/login");

  const rawEngagements = (await db
    .collection(collections.engagements)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .toArray()) as Record<string, unknown>[];

  const engagements: Engagement[] = rawEngagements.map((e) => {
    const id = (e.id ?? (e._id instanceof ObjectId ? e._id.toString() : String(e._id ?? ""))) as string;
    return {
      id,
      date: (e.date as string) || "",
      customerName: (e.customerName as string) || "",
      contact: (e.contact as string) || "",
      source: (e.source as string) || "",
      status: (e.status as string) || "",
      assignedTo: (e.assignedTo as string) || "",
      followUpDate: (e.followUpDate as string) || "",
      remarks: (e.remarks as string) || "",
    };
  });

  return <EngagementPage initialEngagements={engagements} />;
}
