import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { SettingsFormInteractive } from "./settings-form-interactive";

export const metadata = { title: "Settings" };

const getSettings = cache(async (orgId: string) => {
  try {
    return await db.collection("org_settings").findOne({ orgId });
  } catch {
    return null;
  }
});

export default async function SettingsPage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const saved = orgId ? await getSettings(orgId) : null;

  const initial = {
    language: (saved?.language as string) || "en-US",
    timezone: (saved?.timezone as string) || "UTC",
    dateFormat: (saved?.dateFormat as string) || "DD/MM/YYYY",
    brandName: (saved?.brandName as string) || "",
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">General Settings</h1>
      </div>
      <SettingsFormInteractive initial={initial} />
    </div>
  );
}
