import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { SettingsPageClient } from "./settings-interactive";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  let initialSettings: Record<string, unknown> | null = null;

  if (orgId) {
    const settingsDoc = (await db.collection("settings").findOne({ orgId })) as Record<string, unknown> | null;
    if (settingsDoc) {
      const { _id, ...rest } = settingsDoc;
      initialSettings = rest as Record<string, unknown>;
    }
  }

  return <SettingsPageClient orgId={orgId || ""} user={user} initialSettings={initialSettings} />;
}
