import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import MyTime from "./my-time-interactive";

export const dynamic = "force-dynamic";

export default async function MyTimePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId || !session.user.id) {
    return <MyTime initialEntries={[]} user={{ name: "", email: "", avatar: "", id: "" }} />;
  }

  const raw = await db.collection(collections.timeEntries)
    .find({ orgId, userId: session.user.id })
    .sort({ date: -1 })
    .toArray();

  const entries = (raw as unknown as Record<string, unknown>[]).map((e) => ({
    id: (e._id as { toString: () => string }).toString(),
    userId: (e.userId as string) || "",
    date: (e.date as string) || "",
    startTime: (e.startTime as string) || undefined,
    endTime: (e.endTime as string) || undefined,
    duration: (e.duration as number) || 0,
    description: (e.description as string) || "",
    billable: (e.billable as boolean) ?? true,
    status: (e.status as "pending" | "approved" | "rejected") || "pending",
    createdAt: (e.createdAt as string) || "",
  }));

  return (
    <MyTime
      initialEntries={entries}
      user={{
        name: (session.user.name as string) || "",
        email: (session.user.email as string) || "",
        avatar: (session.user.image as string) || "",
        id: session.user.id,
      }}
    />
  );
}
